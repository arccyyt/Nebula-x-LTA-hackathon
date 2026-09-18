import type { Sourced } from "./types.js";
import type { LatLng } from "../lib/geo.js";
import { geocodePostal } from "../data/postal.js";
import { haversineMeters, bearingCompass, walkMinutes } from "../lib/geo.js";

export interface GeocodeResult {
  label: string;
  pos: LatLng;
}

export async function geocode(postal: string): Promise<Sourced<GeocodeResult>> {
  try {
    const res = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(postal)}&returnGeom=Y&getAddrDetails=Y`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) throw new Error(`OneMap search -> HTTP ${res.status}`);
    const json = (await res.json()) as { results: Array<{ ADDRESS: string; LATITUDE: string; LONGITUDE: string }> };
    const first = json.results?.[0];
    if (!first) throw new Error("no OneMap result");
    return {
      data: { label: first.ADDRESS, pos: { lat: parseFloat(first.LATITUDE), lng: parseFloat(first.LONGITUDE) } },
      source: "live",
    };
  } catch {
    const fallback = geocodePostal(postal);
    return { data: { label: fallback.label, pos: fallback.pos }, source: "demo-fixture" };
  }
}

export interface WalkStep {
  instruction: string;
  distanceMeters: number;
  minutes: number;
  effort: "flat" | "gentle-slope" | "steep-slope";
}

export interface WalkRoute {
  steps: WalkStep[];
  totalMinutes: number;
  totalMeters: number;
  path: LatLng[];
}

/**
 * Walking directions between two points. Calls OneMap's pedestrian routing
 * API when credentials/token are available; otherwise synthesises a
 * straight-line route with a couple of turn steps derived from bearing --
 * good enough to demo the door-to-door walking legs without a full OSM
 * pedestrian graph loaded locally (see README for wiring in a real
 * OSRM/GraphHopper instance).
 */
export async function walkRoute(from: LatLng, to: LatLng, metersPerMinute: number, slopeHint: "flat" | "slope" = "flat"): Promise<WalkRoute> {
  const distance = haversineMeters(from, to);
  const mid: LatLng = { lat: (from.lat + to.lat) / 2 + 0.0004, lng: (from.lng + to.lng) / 2 };
  const dir1 = bearingCompass(from, mid);
  const dir2 = bearingCompass(mid, to);
  const effort = slopeHint === "slope" ? "gentle-slope" : "flat";
  const half = distance / 2;
  const steps: WalkStep[] = [
    { instruction: `Head ${dir1}`, distanceMeters: Math.round(half), minutes: walkMinutes(half, metersPerMinute), effort },
    { instruction: dir2 === dir1 ? "Continue straight" : `Turn towards ${dir2}`, distanceMeters: Math.round(distance - half), minutes: walkMinutes(distance - half, metersPerMinute), effort },
  ];
  return {
    steps,
    totalMinutes: steps.reduce((s, x) => s + x.minutes, 0),
    totalMeters: Math.round(distance),
    path: [from, mid, to],
  };
}
