import type { Sourced } from "./types.js";
import {
  NORMAL_DAY_ALERTS,
  INJECTED_DISRUPTION_ALERTS,
  type TrainServiceAlertsResponse,
} from "../data/alerts.js";
import { getRealtimeCrowd, getForecastSlots, type CrowdReading } from "../data/crowd.js";
import { LIFT_STATUS, normalizeLiftRecords, type LiftStatus, type RawLiftMaintenanceRecord } from "../data/facilities.js";
import { BUS_STOPS, normalizeBusArrival, type BusStopArrivals, type RawBusArrivalResponse } from "../data/bus.js";

const BASE = "https://datamall2.mytransport.sg/ltaodataservice";

function accountKey(): string | undefined {
  return process.env.LTA_ACCOUNT_KEY || undefined;
}

async function callLta<T>(path: string, validate?: (data: unknown) => boolean): Promise<T> {
  const key = accountKey();
  if (!key) throw new Error("no LTA_ACCOUNT_KEY configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { AccountKey: key, accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`LTA DataMall ${path} -> HTTP ${res.status}`);
  const data = await res.json();
  // A 200 with a shape we don't recognise is treated the same as a failure
  // (falls back to the fixture) rather than passed through as "live" --
  // this guards against silently wrong data if a field name assumption
  // here (made without being able to re-check the PDF spec against a real
  // response) turns out not to match what the live endpoint actually sends.
  if (validate && !validate(data)) throw new Error(`LTA DataMall ${path} -> unexpected response shape`);
  return data as T;
}

const isOdataList = (data: unknown): data is { value: unknown[] } =>
  typeof data === "object" && data !== null && Array.isArray((data as { value?: unknown }).value);

let demoDisruptionActive = true; // demo default: show the disruption-response path

export function setDemoDisruption(active: boolean) {
  demoDisruptionActive = active;
}

export async function getTrainServiceAlerts(): Promise<Sourced<TrainServiceAlertsResponse>> {
  try {
    const data = await callLta<TrainServiceAlertsResponse>(
      "/TrainServiceAlerts",
      (d): boolean => typeof d === "object" && d !== null && "Status" in d && Array.isArray((d as { AffectedSegments?: unknown }).AffectedSegments),
    );
    return { data, source: "live" };
  } catch {
    const data = demoDisruptionActive ? INJECTED_DISRUPTION_ALERTS : NORMAL_DAY_ALERTS;
    return {
      data,
      source: "demo-fixture",
      note: demoDisruptionActive
        ? "Injected demo disruption (see brief 2.6: real feed is quiet most days)."
        : "Normal-day fixture: no active disruptions.",
    };
  }
}

export async function getPcdRealtime(crowdLineCode: string, stationCode: string, forceHigh: boolean): Promise<Sourced<CrowdReading>> {
  try {
    const data = await callLta<{ value: CrowdReading[] }>(`/PCDRealTime?TrainLine=${crowdLineCode}`, isOdataList);
    const match = data.value.find((v) => v.Station === stationCode) ?? data.value[0];
    if (!match) throw new Error("PCDRealTime: no matching station in live response");
    return { data: match, source: "live" };
  } catch {
    return { data: getRealtimeCrowd(stationCode, new Date(), forceHigh), source: "demo-fixture" };
  }
}

export async function getPcdForecast(crowdLineCode: string, stationCode: string, day: Date = new Date()): Promise<Sourced<CrowdReading[]>> {
  try {
    const data = await callLta<{ value: CrowdReading[] }>(`/PCDForecast?TrainLine=${crowdLineCode}`, isOdataList);
    const forStation = data.value.filter((v) => v.Station === stationCode);
    return { data: forStation.length ? forStation : data.value, source: "live" };
  } catch {
    return { data: getForecastSlots(stationCode, day), source: "demo-fixture" };
  }
}

// v2/FacilitiesMaintenance's real fields (Line, StationCode, StationName,
// LiftID, LiftDesc) are confirmed against LTA's published API guide -- see
// data/facilities.ts. It's an ad-hoc list of lifts currently under
// maintenance, normalised here into the same LiftStatus shape the fixture
// and planJourney.ts already use.
export async function getFacilitiesMaintenance(): Promise<Sourced<LiftStatus[]>> {
  try {
    const data = await callLta<{ value: RawLiftMaintenanceRecord[] }>("/FacilitiesMaintenance", isOdataList);
    return { data: normalizeLiftRecords(data.value), source: "live" };
  } catch {
    return { data: LIFT_STATUS, source: "demo-fixture" };
  }
}

// v3/BusArrival nests up to 3 upcoming arrivals per service as
// NextBus/NextBus2/NextBus3 (confirmed shape for Load/Feature/Type) --
// normalised here into the flat per-arrival shape the rest of the app uses.
export async function getBusArrival(busStopCode: string): Promise<Sourced<BusStopArrivals>> {
  try {
    const data = await callLta<RawBusArrivalResponse>(
      `/v3/BusArrival?BusStopCode=${busStopCode}`,
      (d): boolean => typeof d === "object" && d !== null && Array.isArray((d as { Services?: unknown }).Services),
    );
    return { data: normalizeBusArrival(data, new Date()), source: "live" };
  } catch {
    const fixture = BUS_STOPS[busStopCode] ?? Object.values(BUS_STOPS)[0];
    return { data: fixture, source: "demo-fixture" };
  }
}
