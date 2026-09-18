import type { Sourced } from "./types.js";
import {
  NORMAL_DAY_ALERTS,
  INJECTED_DISRUPTION_ALERTS,
  type TrainServiceAlertsResponse,
} from "../data/alerts.js";
import { getRealtimeCrowd, getForecastSlots, type CrowdReading } from "../data/crowd.js";
import { LIFT_STATUS, type LiftStatus } from "../data/facilities.js";
import { BUS_STOPS, type BusStopArrivals } from "../data/bus.js";

const BASE = "https://datamall2.mytransport.sg/ltaodataservice";

function accountKey(): string | undefined {
  return process.env.LTA_ACCOUNT_KEY || undefined;
}

async function callLta<T>(path: string): Promise<T> {
  const key = accountKey();
  if (!key) throw new Error("no LTA_ACCOUNT_KEY configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { AccountKey: key, accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`LTA DataMall ${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

let demoDisruptionActive = true; // demo default: show the disruption-response path

export function setDemoDisruption(active: boolean) {
  demoDisruptionActive = active;
}

export async function getTrainServiceAlerts(): Promise<Sourced<TrainServiceAlertsResponse>> {
  try {
    const data = await callLta<TrainServiceAlertsResponse>("/TrainServiceAlerts");
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
    const data = await callLta<{ value: CrowdReading[] }>(`/PCDRealTime?TrainLine=${crowdLineCode}`);
    const match = data.value.find((v) => v.Station === stationCode) ?? data.value[0];
    return { data: match, source: "live" };
  } catch {
    return { data: getRealtimeCrowd(stationCode, new Date(), forceHigh), source: "demo-fixture" };
  }
}

export async function getPcdForecast(crowdLineCode: string, stationCode: string, day: Date = new Date()): Promise<Sourced<CrowdReading[]>> {
  try {
    const data = await callLta<{ value: CrowdReading[] }>(`/PCDForecast?TrainLine=${crowdLineCode}`);
    const forStation = data.value.filter((v) => v.Station === stationCode);
    return { data: forStation.length ? forStation : data.value, source: "live" };
  } catch {
    return { data: getForecastSlots(stationCode, day), source: "demo-fixture" };
  }
}

export async function getFacilitiesMaintenance(): Promise<Sourced<LiftStatus[]>> {
  try {
    const data = await callLta<{ value: LiftStatus[] }>("/FacilitiesMaintenance");
    return { data: data.value, source: "live" };
  } catch {
    return { data: LIFT_STATUS, source: "demo-fixture" };
  }
}

export async function getBusArrival(busStopCode: string): Promise<Sourced<BusStopArrivals>> {
  try {
    const data = await callLta<BusStopArrivals>(`/v3/BusArrival?BusStopCode=${busStopCode}`);
    return { data, source: "live" };
  } catch {
    const fixture = BUS_STOPS[busStopCode] ?? Object.values(BUS_STOPS)[0];
    return { data: fixture, source: "demo-fixture" };
  }
}
