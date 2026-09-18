// Mirrors data.gov.sg's 2-hour nowcast shape (area -> forecast text). Rain is
// seeded over the east (Bedok/Tampines) sector, which is exactly where
// Rachel and Mdm Lim start their journeys -- so the sheltered-routing
// penalty has something to bite on in the demo.
export interface AreaForecast {
  area: string;
  forecast: string;
}

export const NOWCAST_AREAS: AreaForecast[] = [
  { area: "Bedok", forecast: "Heavy Thundery Showers" },
  { area: "Tampines", forecast: "Light Rain" },
  { area: "Outram", forecast: "Cloudy" },
  { area: "one-north", forecast: "Fair" },
  { area: "Punggol", forecast: "Fair" },
  { area: "City", forecast: "Cloudy" },
];

const RAIN_TERMS = ["rain", "showers", "thundery"];

export function isRainingNear(areaName: string): boolean {
  const entry = NOWCAST_AREAS.find((a) => a.area.toLowerCase() === areaName.toLowerCase());
  if (!entry) return false;
  return RAIN_TERMS.some((t) => entry.forecast.toLowerCase().includes(t));
}
