import { geocode, walkRoute, type WalkRoute } from "../adapters/onemap.js";
import { getTrainServiceAlerts, getPcdForecast, getFacilitiesMaintenance, getBusArrival } from "../adapters/lta.js";
import { getNowcast, isRaining } from "../adapters/datagovsg.js";
import { generateNarrative, type NarrativeContext, type Narrative } from "../adapters/vertexai.js";
import { shortestTransitPath, nearestStation, type TransitLeg } from "./graph.js";
import { STATIONS, type Station } from "../data/stations.js";
import { lineByCanonical } from "../lineTable.js";
import { haversineMeters, type LatLng } from "./geo.js";
import { detectBunching, type BunchingAlert } from "../data/bus.js";
import { shelteredOptionFor, RAIN_PENALTY_MULTIPLIER, SHELTERED_DETOUR_MULTIPLIER } from "../data/sheltered.js";
import type { DataSource } from "../adapters/types.js";

export type Mobility = "standard" | "wheelchair" | "stroller";
export type Persona = "rachel" | "arjun" | "mdmlim" | "custom";

export interface PlanInput {
  originPostal: string;
  destPostal: string;
  departAt?: string;
  persona: Persona;
  mobility?: Mobility;
  avoidRain?: boolean;
}

export type LegStatus = "normal" | "disrupted" | "exposed" | "sheltered";

export interface ItineraryLeg {
  kind: "walk" | "transit" | "bus-bridge";
  label: string;
  line?: string;
  color: string;
  fromLabel: string;
  toLabel: string;
  minutes: number;
  meters?: number;
  status: LegStatus;
  note?: string;
  path: LatLng[];
  steps?: WalkRoute["steps"];
  bunching?: BunchingAlert | null;
}

export interface PlanResult {
  persona: Persona;
  mobility: Mobility;
  origin: { label: string; pos: LatLng };
  destination: { label: string; pos: LatLng };
  departAt: string;
  eta: { minMin: number; typicalMin: number; maxMin: number };
  legs: ItineraryLeg[];
  alternative?: { legs: ItineraryLeg[]; totalMinutes: number; deltaVsPrimaryMin: number; reason: string };
  disruption?: { line: string; stations: string[]; message: string; freeBusStations: string[]; etaDeltaMin: number };
  crowdNudge?: { station: string; time: string; level: string; shiftMinutes: number; newLevel: string };
  liftReroute?: { originalStation: string; exit: string; reroutedTo: string; wabService?: string };
  weatherNote?: string;
  ai: Narrative;
  dataSources: Record<string, DataSource>;
  pointsEarnable: number;
}

const WALK_SPEED_MPM: Record<Mobility, number> = {
  standard: 80,
  wheelchair: 45,
  stroller: 60,
};

const HILLY_STATIONS = new Set(["Outram Park", "Tiong Bahru", "Redhill"]);

const WEATHER_AREAS: Array<{ name: string; pos: LatLng }> = [
  { name: "Bedok", pos: { lat: 1.324, lng: 103.93 } },
  { name: "Tampines", pos: { lat: 1.3536, lng: 103.945 } },
  { name: "Outram", pos: { lat: 1.28, lng: 103.84 } },
  { name: "one-north", pos: { lat: 1.2995, lng: 103.787 } },
  { name: "Punggol", pos: { lat: 1.405, lng: 103.902 } },
  { name: "City", pos: { lat: 1.29, lng: 103.85 } },
];

function nearestWeatherArea(pos: LatLng): string {
  let best = WEATHER_AREAS[0];
  let bestDist = Infinity;
  for (const a of WEATHER_AREAS) {
    const d = haversineMeters(pos, a.pos);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best.name;
}

// STATIONS can have multiple rows sharing a name (interchanges). Find the
// row whose `lines` includes the target line, to recover that line's own
// code for the station (e.g. "Outram Park" -> "EW16" on EWL, "NE3" on NEL).
function codeForStationOnLine(stationName: string, canonicalLine: string): string | undefined {
  const row = STATIONS.find((s) => s.name === stationName && s.lines.includes(canonicalLine));
  return row?.code;
}

function busSpeedMinutes(distanceMeters: number): number {
  const BUS_METERS_PER_MIN = 300; // ~18 km/h incl. stops
  return Math.max(2, Math.ceil(distanceMeters / BUS_METERS_PER_MIN) + 3); // +3 min wait
}

export async function planJourney(input: PlanInput): Promise<PlanResult> {
  const mobility: Mobility = input.mobility ?? (input.persona === "mdmlim" ? "wheelchair" : "standard");
  const departAt = input.departAt ? new Date(input.departAt) : new Date();
  const speed = WALK_SPEED_MPM[mobility];
  const dataSources: Record<string, DataSource> = {};

  const [originGeo, destGeo] = await Promise.all([geocode(input.originPostal), geocode(input.destPostal)]);
  dataSources.geocode = originGeo.source === "live" && destGeo.source === "live" ? "live" : "demo-fixture";

  const originStation = nearestStation(originGeo.data.pos);
  const destStation = nearestStation(destGeo.data.pos);

  const [alertsRes, nowcastRes, liftsRes] = await Promise.all([
    getTrainServiceAlerts(),
    getNowcast(),
    getFacilitiesMaintenance(),
  ]);
  dataSources.alerts = alertsRes.source;
  dataSources.weather = nowcastRes.source;
  dataSources.facilities = liftsRes.source;

  const transitPath = shortestTransitPath(originStation.name, destStation.name);
  const legs: ItineraryLeg[] = [];

  // ---- First-mile walk ----
  const firstMileSlope = HILLY_STATIONS.has(originStation.name) ? "slope" : "flat";
  const firstWalk = await walkRoute(originGeo.data.pos, originStation.pos, speed, firstMileSlope);
  const originArea = nearestWeatherArea(originGeo.data.pos);
  const originRaining = isRaining(originArea, nowcastRes.data);
  let weatherNote: string | undefined;
  legs.push(buildWalkLeg("First mile", originGeo.data.label, `${originStation.name} station`, firstWalk, originStation.name, originRaining, (note) => (weatherNote = note)));

  // ---- Transit (with disruption handling) ----
  let disruption: PlanResult["disruption"] | undefined;
  let alternative: PlanResult["alternative"] | undefined;

  if (transitPath && transitPath.legs.length > 0) {
    for (const tLeg of transitPath.legs) {
      const line = lineByCanonical(tLeg.line);
      const affectedSeg = alertsRes.data.Status === 2
        ? alertsRes.data.AffectedSegments.find((s) => s.Line === line?.alertsCode)
        : undefined;
      const affectedCodes = affectedSeg ? affectedSeg.Stations.split(",") : [];
      const touched = tLeg.viaStations.filter((name) => {
        const code = codeForStationOnLine(name, tLeg.line);
        return code && affectedCodes.includes(code);
      });

      const status: LegStatus = touched.length > 0 ? "disrupted" : "normal";
      legs.push({
        kind: "transit",
        label: `${line?.name ?? tLeg.line} towards ${tLeg.toStation}`,
        line: tLeg.line,
        color: status === "disrupted" ? "#E11D2E" : line?.color ?? "#333333",
        fromLabel: tLeg.fromStation,
        toLabel: tLeg.toStation,
        minutes: status === "disrupted" ? Math.round(tLeg.minutes * 1.4) : tLeg.minutes,
        status,
        note: status === "disrupted" ? affectedSeg!.Direction === "Both" ? undefined : `Direction: ${affectedSeg!.Direction}` : undefined,
        path: tLeg.viaStations.map((n) => (STATIONS.find((s) => s.name === n)?.pos)).filter(Boolean) as LatLng[],
      });

      if (status === "disrupted" && affectedSeg) {
        const freeBusStations = affectedSeg.FreePublicBus.split(",").filter((c) => c !== "None");
        const etaDeltaMin = parseDelayMinutes(alertsRes.data.Message[0]?.Content) ?? 15;
        disruption = { line: line?.name ?? tLeg.line, stations: touched, message: alertsRes.data.Message[0]?.Content ?? "Service disruption in effect.", freeBusStations, etaDeltaMin };

        alternative = buildFreeBusAlternative(legs, tLeg, freeBusStations, destStation);
      }
    }
  } else {
    // Fallback: no rail path in the demo graph -- treat as a direct bus leg.
    const dist = haversineMeters(originStation.pos, destStation.pos);
    legs.push({
      kind: "bus-bridge",
      label: "Direct bus (no rail link in this corridor)",
      color: "#0EA5A5",
      fromLabel: originStation.name,
      toLabel: destStation.name,
      minutes: busSpeedMinutes(dist),
      status: "normal",
      path: [originStation.pos, destStation.pos],
    });
  }

  // ---- Last-mile walk, with lift-outage reroute for accessibility mobility ----
  let liftReroute: PlanResult["liftReroute"] | undefined;
  let effectiveDestStation = destStation;
  let lastMileFromLabel = `${destStation.name} station`;

  if (mobility !== "standard") {
    const exit = destStation.exits[0];
    const faulty = liftsRes.data.find((l) => l.station === destStation.name && l.exitId === exit?.id && l.status === "faulty");
    if (faulty) {
      // Reroute to the previous stop on the same line, which has a working lift, and bridge with a WAB bus.
      const line = destStation.lines[0];
      const seqStation = findAdjacentStationWithWorkingLift(destStation, line, liftsRes.data);
      if (seqStation) {
        effectiveDestStation = seqStation;
        lastMileFromLabel = `${seqStation.name} station (WAB bus from here)`;
        liftReroute = { originalStation: destStation.name, exit: faulty.exitLabel, reroutedTo: seqStation.name, wabService: "970" };
        // Replace the tail of the transit leg to end at seqStation instead, and insert a WAB bus-bridge leg.
        const lastTransit = [...legs].reverse().find((l) => l.kind === "transit");
        if (lastTransit) {
          lastTransit.toLabel = seqStation.name;
        }
        const busArrivalRes = await getBusArrival("10009");
        dataSources.bus = busArrivalRes.source;
        const bunching = detectBunching(busArrivalRes.data);
        legs.push({
          kind: "bus-bridge",
          label: `Wheelchair-accessible bus ${liftReroute.wabService} (WAB)`,
          color: "#0EA5A5",
          fromLabel: seqStation.name,
          toLabel: destGeo.data.label,
          minutes: busSpeedMinutes(haversineMeters(seqStation.pos, destGeo.data.pos)),
          status: "normal",
          note: `Lift at ${destStation.name} Exit ${liftReroute.exit} is faulty -- rerouted via ${seqStation.name} with WAB bus.`,
          path: [seqStation.pos, destGeo.data.pos],
          bunching,
        });
      }
    }
  }

  const lastMileSlope = HILLY_STATIONS.has(effectiveDestStation.name) ? "slope" : "flat";
  if (effectiveDestStation.name === destStation.name) {
    const lastWalk = await walkRoute(destStation.pos, destGeo.data.pos, speed, lastMileSlope);
    const destArea = nearestWeatherArea(destGeo.data.pos);
    const destRaining = isRaining(destArea, nowcastRes.data);
    legs.push(buildWalkLeg("Last mile", lastMileFromLabel, destGeo.data.label, lastWalk, destStation.name, destRaining, (note) => (weatherNote = weatherNote ?? note)));
  }

  // ---- Bus bunching on any bus-bridge leg not already checked ----
  for (const leg of legs) {
    if (leg.kind === "bus-bridge" && leg.bunching === undefined) {
      const busArrivalRes = await getBusArrival("75009");
      dataSources.bus = dataSources.bus ?? busArrivalRes.source;
      leg.bunching = detectBunching(busArrivalRes.data);
    }
  }

  // ---- Crowd forecast nudge ----
  let crowdNudge: PlanResult["crowdNudge"] | undefined;
  const lastTransitLeg = transitPath?.legs[transitPath.legs.length - 1];
  if (lastTransitLeg) {
    const line = lineByCanonical(lastTransitLeg.line);
    const code = codeForStationOnLine(lastTransitLeg.toStation, lastTransitLeg.line);
    if (line && code) {
      const forecastRes = await getPcdForecast(line.crowdCode, code, departAt);
      dataSources.crowd = forecastRes.source;
      const totalSoFarMin = legs.reduce((s, l) => s + l.minutes, 0);
      const arrival = new Date(departAt.getTime() + totalSoFarMin * 60000);
      const slot = nearestSlot(forecastRes.data, arrival);
      if (slot && slot.CrowdLevel === "h") {
        const laterArrival = new Date(arrival.getTime() + 15 * 60000);
        const laterSlot = nearestSlot(forecastRes.data, laterArrival);
        if (laterSlot && laterSlot.CrowdLevel !== "h") {
          crowdNudge = {
            station: lastTransitLeg.toStation,
            time: arrival.toISOString(),
            level: "High",
            shiftMinutes: 15,
            newLevel: laterSlot.CrowdLevel === "m" ? "Moderate" : "Low",
          };
        }
      }
    }
  }

  const totalMinutes = legs.reduce((s, l) => s + l.minutes, 0);
  const eta = { minMin: Math.round(totalMinutes * 0.9), typicalMin: totalMinutes, maxMin: Math.round(totalMinutes * 1.25) };

  const narrativeCtx: NarrativeContext = {
    persona: input.persona,
    mobility,
    etaDeltaMin: disruption?.etaDeltaMin ?? 0,
    disruption: disruption ? { line: disruption.line, stations: disruption.stations, message: disruption.message, freeBusStations: disruption.freeBusStations } : undefined,
    rain: weatherNote ? { area: originArea, forecast: "Rain nearby" } : undefined,
    crowd: crowdNudge ? { station: crowdNudge.station, level: "h", time: formatSgtTime(crowdNudge.time) } : undefined,
    bunching: legs.find((l) => l.bunching)?.bunching
      ? { service: legs.find((l) => l.bunching)!.bunching!.service, skipArrivalMin: legs.find((l) => l.bunching)!.bunching!.skipBus.arrivalMin, boardArrivalMin: legs.find((l) => l.bunching)!.bunching!.boardBus.arrivalMin }
      : undefined,
    lift: liftReroute ? { station: liftReroute.originalStation, exit: liftReroute.exit, faulty: true } : undefined,
  };
  const narrativeRes = await generateNarrative(narrativeCtx);
  dataSources.ai = narrativeRes.source;

  return {
    persona: input.persona,
    mobility,
    origin: originGeo.data,
    destination: destGeo.data,
    departAt: departAt.toISOString(),
    eta,
    legs,
    alternative,
    disruption,
    crowdNudge,
    liftReroute,
    weatherNote,
    ai: narrativeRes.data,
    dataSources,
    pointsEarnable: 10 + (crowdNudge ? 30 : 0),
  };
}

function buildWalkLeg(
  label: string,
  fromLabel: string,
  toLabel: string,
  walk: WalkRoute,
  stationName: string,
  raining: boolean,
  onWeatherNote: (note: string) => void,
): ItineraryLeg {
  let status: LegStatus = "normal";
  let minutes = walk.totalMinutes;
  let note: string | undefined;
  if (raining) {
    const sheltered = shelteredOptionFor(stationName);
    if (sheltered) {
      status = "sheltered";
      minutes = Math.round(walk.totalMinutes * SHELTERED_DETOUR_MULTIPLIER);
      note = `Rain nearby -- routed via ${sheltered.label}.`;
    } else {
      status = "exposed";
      minutes = Math.round(walk.totalMinutes * RAIN_PENALTY_MULTIPLIER);
      note = "Rain nearby -- no covered path available on this leg, pace it slower.";
    }
    onWeatherNote(note);
  }
  return {
    kind: "walk",
    label,
    color: status === "exposed" ? "#F59E0B" : status === "sheltered" ? "#2563EB" : "#6B7280",
    fromLabel,
    toLabel,
    minutes,
    meters: walk.totalMeters,
    status,
    note,
    path: walk.path,
    steps: walk.steps,
  };
}

function formatSgtTime(iso: string): string {
  const sgt = new Date(new Date(iso).getTime() + 8 * 3600 * 1000);
  const hh = String(sgt.getUTCHours()).padStart(2, "0");
  const mm = String(sgt.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseDelayMinutes(message?: string): number | undefined {
  if (!message) return undefined;
  const match = message.match(/(\d+)[\s-]*(?:to|-)?\s*(\d+)?\s*min/i);
  if (!match) return undefined;
  const a = parseInt(match[1], 10);
  const b = match[2] ? parseInt(match[2], 10) : a;
  return Math.round((a + b) / 2);
}

function nearestSlot<T extends { StartTime: string; EndTime: string }>(slots: T[], at: Date): T | undefined {
  const containing = slots.find((s) => at.getTime() >= new Date(s.StartTime).getTime() && at.getTime() < new Date(s.EndTime).getTime());
  if (containing) return containing;
  return slots.reduce<{ diff: number; slot?: T }>((best, s) => {
    const diff = Math.abs(new Date(s.StartTime).getTime() - at.getTime());
    return diff < best.diff ? { diff, slot: s } : best;
  }, { diff: Infinity }).slot;
}

function findAdjacentStationWithWorkingLift(station: Station, line: string, lifts: { station: string; exitId: string; status: string }[]): Station | undefined {
  const seq = STATIONS.filter((s) => s.lines.includes(line));
  const idx = seq.findIndex((s) => s.name === station.name);
  const candidates = [seq[idx - 1], seq[idx + 1]].filter(Boolean) as Station[];
  return candidates.find((c) => {
    const badLift = lifts.find((l) => l.station === c.name && l.status === "faulty");
    return !badLift;
  });
}

function buildFreeBusAlternative(
  currentLegs: ItineraryLeg[],
  disruptedLeg: TransitLeg,
  freeBusStations: string[],
  destStation: Station,
): PlanResult["alternative"] | undefined {
  if (freeBusStations.length < 1) return undefined;
  const orderedTouched = disruptedLeg.viaStations.filter((name) => {
    const code = codeForStationOnLine(name, disruptedLeg.line);
    return code && freeBusStations.includes(code);
  });
  if (orderedTouched.length === 0) return undefined;
  const nearBoundaryName = orderedTouched[0];
  const farBoundaryName = orderedTouched[orderedTouched.length - 1];
  const nearStationObj = STATIONS.find((s) => s.name === nearBoundaryName)!;
  const farStationObj = STATIONS.find((s) => s.name === farBoundaryName)!;

  const altLegs: ItineraryLeg[] = currentLegs.map((l) => ({ ...l }));
  const keptTransit = altLegs[altLegs.length - 1]; // the disrupted transit leg just pushed by the caller
  if (keptTransit && keptTransit.kind === "transit") {
    const nearIdx = disruptedLeg.viaStations.indexOf(nearBoundaryName);
    const totalStops = disruptedLeg.viaStations.length - 1;
    const portionMinutes = totalStops > 0 ? Math.round(disruptedLeg.minutes * (nearIdx / totalStops)) : disruptedLeg.minutes;
    keptTransit.toLabel = nearBoundaryName;
    keptTransit.minutes = Math.max(3, portionMinutes);
    keptTransit.status = "normal";
    keptTransit.color = lineByCanonical(disruptedLeg.line)?.color ?? "#009645";
  }
  const bridgeMinutes = busSpeedMinutes(haversineMeters(nearStationObj.pos, farStationObj.pos));
  altLegs.push({
    kind: "bus-bridge",
    label: "Free bus bridge (LTA-arranged, no fare)",
    color: "#0EA5A5",
    fromLabel: nearBoundaryName,
    toLabel: farBoundaryName,
    minutes: bridgeMinutes,
    status: "normal",
    note: "Free boarding activated by LTA for this disruption.",
    path: [nearStationObj.pos, farStationObj.pos],
  });
  if (farBoundaryName !== destStation.name) {
    altLegs.push({
      kind: "transit",
      label: `Continue towards ${destStation.name}`,
      line: disruptedLeg.line,
      color: "#009645",
      fromLabel: farBoundaryName,
      toLabel: destStation.name,
      minutes: 4,
      status: "normal",
      path: [farStationObj.pos, destStation.pos],
    });
  }
  const originalTotal = currentLegs.reduce((s, l) => s + l.minutes, 0);
  const altTotal = altLegs.reduce((s, l) => s + l.minutes, 0);
  return {
    legs: altLegs,
    totalMinutes: altTotal,
    deltaVsPrimaryMin: altTotal - originalTotal,
    reason: "Skips the disrupted segment entirely via the LTA-arranged free bus bridge.",
  };
}
