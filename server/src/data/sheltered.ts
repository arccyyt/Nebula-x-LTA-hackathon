import type { LatLng } from "../lib/geo.js";

// Stand-in for the CoveredLinkWay / PedestrainOverheadbridge_UnderPass
// GeoJSON layers -- a handful of sheltered corridors near the demo stations,
// enough to demonstrate the rain-routing penalty end to end on the map.
export interface CoveredLinkway {
  id: string;
  label: string;
  path: LatLng[];
  nearStation: string;
}

export const COVERED_LINKWAYS: CoveredLinkway[] = [
  {
    id: "outram-sgh",
    label: "Covered linkway: Outram Park Exit 3 -> SGH main entrance",
    nearStation: "Outram Park",
    path: [
      { lat: 1.2806, lng: 103.8398 },
      { lat: 1.2801, lng: 103.8380 },
      { lat: 1.2795, lng: 103.8362 },
    ],
  },
  {
    id: "onenorth-fusionopolis",
    label: "Covered linkway: one-north Exit A -> Fusionopolis",
    nearStation: "one-north",
    path: [
      { lat: 1.2997, lng: 103.7875 },
      { lat: 1.2996, lng: 103.7878 },
    ],
  },
];

/** Rough heuristic: is there a sheltered alternative for the walk out of `stationName`? */
export function shelteredOptionFor(stationName: string): CoveredLinkway | undefined {
  return COVERED_LINKWAYS.find((c) => c.nearStation === stationName);
}

export const RAIN_PENALTY_MULTIPLIER = 1.6; // exposed walk takes ~60% longer effectively (slower pace, puddle avoidance)
export const SHELTERED_DETOUR_MULTIPLIER = 1.15; // sheltered path is ~15% longer but avoids the rain penalty
