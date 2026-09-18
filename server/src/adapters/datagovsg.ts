import type { Sourced } from "./types.js";
import { NOWCAST_AREAS, isRainingNear, type AreaForecast } from "../data/weather.js";

// data.gov.sg's 2-hour nowcast needs no API key, so we always attempt a live
// call first; the fixture only covers the proxy/offline case.
export async function getNowcast(): Promise<Sourced<AreaForecast[]>> {
  try {
    const res = await fetch("https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`data.gov.sg nowcast -> HTTP ${res.status}`);
    const json = (await res.json()) as {
      data: { area_metadata: { name: string }[]; items: [{ forecasts: { area: string; forecast: string }[] }] };
    };
    const forecasts = json.data.items[0].forecasts;
    return { data: forecasts.map((f) => ({ area: f.area, forecast: f.forecast })), source: "live" };
  } catch {
    return { data: NOWCAST_AREAS, source: "demo-fixture" };
  }
}

export function isRaining(areaName: string, forecasts: AreaForecast[]): boolean {
  const live = forecasts.find((a) => a.area.toLowerCase() === areaName.toLowerCase());
  if (live) return /rain|shower|thundery/i.test(live.forecast);
  return isRainingNear(areaName);
}
