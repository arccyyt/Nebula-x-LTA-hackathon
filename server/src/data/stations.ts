import type { LatLng } from "../lib/geo.js";

export interface Station {
  code: string; // e.g. EW16, NE3 -- the code used within a single line's sequence
  name: string;
  lines: string[]; // canonical line codes this station sits on (interchange = >1)
  pos: LatLng;
  exits: StationExit[];
}

export interface StationExit {
  id: string; // e.g. "OutramPark-3"
  label: string; // "Exit 3 (SGH)"
  pos: LatLng;
  hasLift: boolean; // static design fact: does this exit have a lift at all
}

// Illustrative station set covering the three personas' corridors plus enough
// interchanges to make the pathfinder generic. Coordinates are approximate
// (demo purposes only) -- NOT the authoritative AmendmentToMP2014RailStation
// footprints. Swap `data/stations.ts` for a loader over that GeoJSON (see
// README) to go from illustrative to authoritative without touching the
// routing code.
export const STATIONS: Station[] = [
  { code: "EW2", name: "Tampines", lines: ["EWL"], pos: { lat: 1.3536, lng: 103.9450 }, exits: [
    { id: "EW2-1", label: "Exit 1", pos: { lat: 1.3538, lng: 103.9453 }, hasLift: true },
  ] },
  { code: "EW3", name: "Simei", lines: ["EWL"], pos: { lat: 1.3430, lng: 103.9532 }, exits: [
    { id: "EW3-1", label: "Exit A", pos: { lat: 1.3432, lng: 103.9534 }, hasLift: true },
  ] },
  { code: "EW5", name: "Bedok", lines: ["EWL"], pos: { lat: 1.3240, lng: 103.9300 }, exits: [
    { id: "EW5-1", label: "Exit A", pos: { lat: 1.3244, lng: 103.9304 }, hasLift: true },
    { id: "EW5-2", label: "Exit B", pos: { lat: 1.3238, lng: 103.9296 }, hasLift: true },
  ] },
  { code: "EW6", name: "Kembangan", lines: ["EWL"], pos: { lat: 1.3208, lng: 103.9128 }, exits: [
    { id: "EW6-1", label: "Exit A", pos: { lat: 1.3210, lng: 103.9130 }, hasLift: true },
  ] },
  { code: "EW7", name: "Eunos", lines: ["EWL"], pos: { lat: 1.3197, lng: 103.9032 }, exits: [
    { id: "EW7-1", label: "Exit A", pos: { lat: 1.3199, lng: 103.9034 }, hasLift: true },
  ] },
  { code: "EW8", name: "Paya Lebar", lines: ["EWL", "CCL"], pos: { lat: 1.3177, lng: 103.8925 }, exits: [
    { id: "EW8-1", label: "Exit A", pos: { lat: 1.3179, lng: 103.8927 }, hasLift: true },
  ] },
  { code: "EW9", name: "Aljunied", lines: ["EWL"], pos: { lat: 1.3163, lng: 103.8827 }, exits: [
    { id: "EW9-1", label: "Exit A", pos: { lat: 1.3165, lng: 103.8829 }, hasLift: true },
  ] },
  { code: "EW10", name: "Kallang", lines: ["EWL"], pos: { lat: 1.3117, lng: 103.8713 }, exits: [
    { id: "EW10-1", label: "Exit A", pos: { lat: 1.3119, lng: 103.8715 }, hasLift: true },
  ] },
  { code: "EW11", name: "Lavender", lines: ["EWL"], pos: { lat: 1.3072, lng: 103.8631 }, exits: [
    { id: "EW11-1", label: "Exit A", pos: { lat: 1.3074, lng: 103.8633 }, hasLift: true },
  ] },
  { code: "EW12", name: "Bugis", lines: ["EWL", "DTL"], pos: { lat: 1.3006, lng: 103.8559 }, exits: [
    { id: "EW12-1", label: "Exit A", pos: { lat: 1.3008, lng: 103.8561 }, hasLift: true },
  ] },
  { code: "EW13", name: "City Hall", lines: ["EWL", "NSL"], pos: { lat: 1.2932, lng: 103.8519 }, exits: [
    { id: "EW13-1", label: "Exit A", pos: { lat: 1.2934, lng: 103.8521 }, hasLift: true },
  ] },
  { code: "EW14", name: "Raffles Place", lines: ["EWL", "NSL"], pos: { lat: 1.2836, lng: 103.8515 }, exits: [
    { id: "EW14-1", label: "Exit A (Republic Plaza)", pos: { lat: 1.2839, lng: 103.8514 }, hasLift: true },
    { id: "EW14-2", label: "Exit G (OUE Bayfront)", pos: { lat: 1.2822, lng: 103.8524 }, hasLift: true },
  ] },
  { code: "EW15", name: "Tanjong Pagar", lines: ["EWL"], pos: { lat: 1.2764, lng: 103.8459 }, exits: [
    { id: "EW15-1", label: "Exit A", pos: { lat: 1.2766, lng: 103.8461 }, hasLift: true },
  ] },
  { code: "EW16", name: "Outram Park", lines: ["EWL", "NEL", "TEL"], pos: { lat: 1.2802, lng: 103.8395 }, exits: [
    { id: "EW16-3", label: "Exit 3 (towards SGH)", pos: { lat: 1.2799, lng: 103.8362 }, hasLift: true },
    { id: "EW16-1", label: "Exit 1", pos: { lat: 1.2806, lng: 103.8398 }, hasLift: true },
  ] },
  { code: "EW17", name: "Tiong Bahru", lines: ["EWL"], pos: { lat: 1.2861, lng: 103.8268 }, exits: [
    { id: "EW17-1", label: "Exit A", pos: { lat: 1.2863, lng: 103.8270 }, hasLift: true },
  ] },
  { code: "EW21", name: "Buona Vista", lines: ["EWL", "CCL"], pos: { lat: 1.3067, lng: 103.7900 }, exits: [
    { id: "EW21-1", label: "Exit A", pos: { lat: 1.3069, lng: 103.7902 }, hasLift: true },
  ] },
  { code: "NE17", name: "Punggol", lines: ["NEL", "PGLRT"], pos: { lat: 1.4054, lng: 103.9021 }, exits: [
    { id: "NE17-1", label: "Exit A", pos: { lat: 1.4056, lng: 103.9023 }, hasLift: true },
  ] },
  { code: "NE15", name: "Buangkok", lines: ["NEL"], pos: { lat: 1.3827, lng: 103.8926 }, exits: [
    { id: "NE15-1", label: "Exit A", pos: { lat: 1.3829, lng: 103.8928 }, hasLift: true },
  ] },
  { code: "NE14", name: "Hougang", lines: ["NEL"], pos: { lat: 1.3712, lng: 103.8925 }, exits: [
    { id: "NE14-1", label: "Exit A", pos: { lat: 1.3714, lng: 103.8927 }, hasLift: true },
  ] },
  { code: "NE13", name: "Kovan", lines: ["NEL"], pos: { lat: 1.3601, lng: 103.8926 }, exits: [
    { id: "NE13-1", label: "Exit A", pos: { lat: 1.3603, lng: 103.8928 }, hasLift: true },
  ] },
  { code: "NE12", name: "Serangoon", lines: ["NEL", "CCL"], pos: { lat: 1.3499, lng: 103.8735 }, exits: [
    { id: "NE12-1", label: "Exit A", pos: { lat: 1.3501, lng: 103.8737 }, hasLift: true },
  ] },
  { code: "NE3", name: "Outram Park", lines: ["EWL", "NEL", "TEL"], pos: { lat: 1.2802, lng: 103.8395 }, exits: [
    { id: "EW16-3", label: "Exit 3 (towards SGH)", pos: { lat: 1.2799, lng: 103.8362 }, hasLift: true },
  ] },
  { code: "CC9", name: "Paya Lebar", lines: ["EWL", "CCL"], pos: { lat: 1.3177, lng: 103.8925 }, exits: [
    { id: "EW8-1", label: "Exit A", pos: { lat: 1.3179, lng: 103.8927 }, hasLift: true },
  ] },
  { code: "CC13", name: "Serangoon", lines: ["NEL", "CCL"], pos: { lat: 1.3499, lng: 103.8735 }, exits: [
    { id: "NE12-1", label: "Exit A", pos: { lat: 1.3501, lng: 103.8737 }, hasLift: true },
  ] },
  { code: "CC15", name: "Bishan", lines: ["NSL", "CCL"], pos: { lat: 1.3512, lng: 103.8486 }, exits: [
    { id: "CC15-1", label: "Exit A", pos: { lat: 1.3514, lng: 103.8488 }, hasLift: true },
  ] },
  { code: "CC19", name: "Botanic Gardens", lines: ["CCL", "DTL"], pos: { lat: 1.3229, lng: 103.8154 }, exits: [
    { id: "CC19-1", label: "Exit A", pos: { lat: 1.3231, lng: 103.8156 }, hasLift: true },
  ] },
  { code: "CC21", name: "Holland Village", lines: ["CCL"], pos: { lat: 1.3113, lng: 103.7963 }, exits: [
    { id: "CC21-1", label: "Exit A", pos: { lat: 1.3115, lng: 103.7965 }, hasLift: true },
  ] },
  { code: "CC22", name: "Buona Vista", lines: ["EWL", "CCL"], pos: { lat: 1.3067, lng: 103.7900 }, exits: [
    { id: "EW21-1", label: "Exit A", pos: { lat: 1.3069, lng: 103.7902 }, hasLift: true },
  ] },
  { code: "CC23", name: "one-north", lines: ["CCL"], pos: { lat: 1.2995, lng: 103.7873 }, exits: [
    { id: "CC23-1", label: "Exit A (Fusionopolis)", pos: { lat: 1.2997, lng: 103.7875 }, hasLift: true },
  ] },
  { code: "NS17", name: "Bishan", lines: ["NSL", "CCL"], pos: { lat: 1.3512, lng: 103.8486 }, exits: [
    { id: "CC15-1", label: "Exit A", pos: { lat: 1.3514, lng: 103.8488 }, hasLift: true },
  ] },
  { code: "NS25", name: "City Hall", lines: ["EWL", "NSL"], pos: { lat: 1.2932, lng: 103.8519 }, exits: [
    { id: "EW13-1", label: "Exit A", pos: { lat: 1.2934, lng: 103.8521 }, hasLift: true },
  ] },
  { code: "NS26", name: "Raffles Place", lines: ["EWL", "NSL"], pos: { lat: 1.2836, lng: 103.8515 }, exits: [
    { id: "EW14-1", label: "Exit A (Republic Plaza)", pos: { lat: 1.2839, lng: 103.8514 }, hasLift: true },
  ] },
];

// Per-line, ordered station sequences used to build the routing graph. Real
// networks have more stops than this; the point is a graph shape realistic
// enough to demo pathfinding + interchange transfers, not a full topology.
export const LINE_SEQUENCES: Record<string, string[]> = {
  EWL: ["EW2", "EW3", "EW5", "EW6", "EW7", "EW8", "EW9", "EW10", "EW11", "EW12", "EW13", "EW14", "EW15", "EW16", "EW17", "EW21"],
  NSL: ["NS17", "NS25", "NS26"],
  NEL: ["NE17", "NE15", "NE14", "NE13", "NE12", "NE3"],
  CCL: ["CC9", "CC13", "CC15", "CC19", "CC21", "CC22", "CC23"],
};

export function findStation(code: string): Station | undefined {
  return STATIONS.find((s) => s.code === code);
}

export function stationsGeoJSON() {
  const seen = new Set<string>();
  const features = STATIONS.filter((s) => {
    const key = s.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((s) => ({
    type: "Feature" as const,
    properties: { name: s.name, lines: s.lines, isInterchange: s.lines.length > 1 },
    geometry: { type: "Point" as const, coordinates: [s.pos.lng, s.pos.lat] },
  }));
  return { type: "FeatureCollection" as const, features };
}
