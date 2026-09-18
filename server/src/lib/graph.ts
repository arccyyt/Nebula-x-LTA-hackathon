import { STATIONS, LINE_SEQUENCES, type Station } from "../data/stations.js";
import { haversineMeters } from "./geo.js";

const TRAIN_METERS_PER_MIN = 583; // ~35 km/h incl. acceleration
const DWELL_MIN = 1;
const TRANSFER_PENALTY_MIN = 4;

interface Node {
  name: string;
  pos: Station["pos"];
  lines: Set<string>;
}

function buildNodes(): Map<string, Node> {
  const nodes = new Map<string, Node>();
  for (const s of STATIONS) {
    const existing = nodes.get(s.name);
    if (existing) {
      s.lines.forEach((l) => existing.lines.add(l));
    } else {
      nodes.set(s.name, { name: s.name, pos: s.pos, lines: new Set(s.lines) });
    }
  }
  return nodes;
}

function codeToName(code: string): string | undefined {
  return STATIONS.find((s) => s.code === code)?.name;
}

interface Edge {
  to: string;
  minutes: number;
  line: string;
}

function buildAdjacency(): Map<string, Edge[]> {
  const adj = new Map<string, Edge[]>();
  const push = (a: string, b: string, line: string) => {
    const minutes = DWELL_MIN + haversineMeters(
      STATIONS.find((s) => s.name === a)!.pos,
      STATIONS.find((s) => s.name === b)!.pos,
    ) / TRAIN_METERS_PER_MIN;
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ to: b, minutes, line });
  };
  for (const [line, codes] of Object.entries(LINE_SEQUENCES)) {
    for (let i = 0; i < codes.length - 1; i++) {
      const a = codeToName(codes[i]);
      const b = codeToName(codes[i + 1]);
      if (!a || !b) continue;
      push(a, b, line);
      push(b, a, line);
    }
  }
  return adj;
}

export interface TransitLeg {
  line: string;
  fromStation: string;
  toStation: string;
  viaStations: string[];
  minutes: number;
}

export interface TransitPath {
  legs: TransitLeg[];
  totalMinutes: number;
}

/** Dijkstra over the station-name graph, then re-segmented into per-line legs with transfer penalties. */
export function shortestTransitPath(originStation: string, destStation: string): TransitPath | null {
  const nodes = buildNodes();
  const adj = buildAdjacency();
  if (!nodes.has(originStation) || !nodes.has(destStation)) return null;
  if (originStation === destStation) return { legs: [], totalMinutes: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  for (const name of nodes.keys()) dist.set(name, Infinity);
  dist.set(originStation, 0);

  while (visited.size < nodes.size) {
    let u: string | null = null;
    let best = Infinity;
    for (const [name, d] of dist) {
      if (!visited.has(name) && d < best) {
        best = d;
        u = name;
      }
    }
    if (u === null) break;
    visited.add(u);
    if (u === destStation) break;
    for (const edge of adj.get(u) ?? []) {
      const alt = best + edge.minutes;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
      }
    }
  }

  if (!prev.has(destStation) && originStation !== destStation) return null;

  const pathNames: string[] = [destStation];
  let cur = destStation;
  while (cur !== originStation) {
    const p = prev.get(cur);
    if (!p) return null;
    pathNames.unshift(p);
    cur = p;
  }

  // Re-segment consecutive station pairs into per-line legs.
  const legs: TransitLeg[] = [];
  let currentLine: string | null = null;
  let legStations: string[] = [pathNames[0]];
  for (let i = 0; i < pathNames.length - 1; i++) {
    const a = pathNames[i];
    const b = pathNames[i + 1];
    const options = (adj.get(a) ?? []).filter((e) => e.to === b);
    const chosen = options.sort((x, y) => x.minutes - y.minutes)[0];
    const line: string = chosen?.line ?? currentLine ?? "EWL";
    if (currentLine === null) currentLine = line;
    if (line !== currentLine) {
      legs.push(makeLeg(currentLine as string, legStations));
      currentLine = line;
      legStations = [a];
    }
    legStations.push(b);
  }
  if (currentLine) legs.push(makeLeg(currentLine, legStations));

  const transferMinutes = (legs.length - 1) * TRANSFER_PENALTY_MIN;
  const totalMinutes = legs.reduce((sum, l) => sum + l.minutes, 0) + transferMinutes;
  return { legs, totalMinutes };
}

function makeLeg(line: string, stations: string[]): TransitLeg {
  const adj = buildAdjacency();
  let minutes = 0;
  for (let i = 0; i < stations.length - 1; i++) {
    const edge = (adj.get(stations[i]) ?? []).find((e) => e.to === stations[i + 1] && e.line === line);
    minutes += edge?.minutes ?? 3;
  }
  return {
    line,
    fromStation: stations[0],
    toStation: stations[stations.length - 1],
    viaStations: stations,
    minutes: Math.round(minutes),
  };
}

export function nearestStation(pos: { lat: number; lng: number }): Station {
  let best = STATIONS[0];
  let bestDist = Infinity;
  for (const s of STATIONS) {
    const d = haversineMeters(pos, s.pos);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}
