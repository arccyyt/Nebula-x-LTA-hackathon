import type { LatLng } from "../lib/geo.js";

// Known demo addresses -- the three personas' homes/destinations, geocoded
// by hand for the demo. Anything else falls back to a rough postal-district
// centroid (see `districtFallback`). In live mode the OneMap adapter
// (adapters/onemap.ts) calls the real /commonapi/search geocoder instead and
// this table is skipped entirely.
const KNOWN: Record<string, { label: string; pos: LatLng }> = {
  "529510": { label: "Tampines St 11 (Rachel's home)", pos: { lat: 1.3536, lng: 103.9455 } },
  "048623": { label: "Raffles Place (Rachel's office)", pos: { lat: 1.2833, lng: 103.8512 } },
  "828761": { label: "Punggol Walk (Arjun's home)", pos: { lat: 1.4050, lng: 103.9028 } },
  "138567": { label: "one-north / Fusionopolis (Arjun's office)", pos: { lat: 1.2996, lng: 103.7878 } },
  "469660": { label: "Bedok North (Mdm Lim's home)", pos: { lat: 1.3245, lng: 103.9312 } },
  "169608": { label: "Singapore General Hospital", pos: { lat: 1.2789, lng: 103.8358 } },
};

// Very rough centroid per 2-digit postal sector prefix, for postal codes not
// in KNOWN. This is a coarse fallback for demo purposes only -- production
// should geocode via OneMap.
const DISTRICT_FALLBACK: Array<{ prefixes: string[]; label: string; pos: LatLng }> = [
  { prefixes: ["01", "02", "03", "04", "05", "06"], label: "Downtown Core", pos: { lat: 1.284, lng: 103.851 } },
  { prefixes: ["07", "08"], label: "Rochor / Bugis", pos: { lat: 1.301, lng: 103.855 } },
  { prefixes: ["14", "15", "16"], label: "Bedok / Eunos", pos: { lat: 1.324, lng: 103.930 } },
  { prefixes: ["17", "18"], label: "Tampines / Pasir Ris", pos: { lat: 1.354, lng: 103.945 } },
  { prefixes: ["19", "20"], label: "Serangoon / Hougang", pos: { lat: 1.372, lng: 103.892 } },
  { prefixes: ["82", "83"], label: "Punggol / Sengkang", pos: { lat: 1.399, lng: 103.905 } },
  { prefixes: ["13"], label: "one-north / Queenstown", pos: { lat: 1.300, lng: 103.792 } },
  { prefixes: ["16", "17"], label: "Bukit Merah / Outram", pos: { lat: 1.283, lng: 103.832 } },
];

export function geocodePostal(postal: string): { label: string; pos: LatLng; source: "known" | "district-fallback" } {
  const known = KNOWN[postal];
  if (known) return { ...known, source: "known" };
  const prefix = postal.slice(0, 2);
  const district = DISTRICT_FALLBACK.find((d) => d.prefixes.includes(prefix));
  if (district) return { label: district.label, pos: district.pos, source: "district-fallback" };
  return { label: "Singapore (city centre estimate)", pos: { lat: 1.2903, lng: 103.8519 }, source: "district-fallback" };
}
