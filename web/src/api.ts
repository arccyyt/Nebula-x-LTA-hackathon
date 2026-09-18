import type { PlanResult, Mobility, Persona } from "./types";

const BASE = "/api";

export async function planRoute(input: {
  originPostal: string;
  destPostal: string;
  departAt?: string;
  persona: Persona;
  mobility?: Mobility;
}): Promise<PlanResult> {
  const res = await fetch(`${BASE}/route/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Plan failed: ${res.status}`);
  return res.json();
}

export async function getStationsGeoJSON() {
  const res = await fetch(`${BASE}/stations/geojson`);
  return res.json();
}

export async function getCoveredLinkways() {
  const res = await fetch(`${BASE}/stations/covered-linkways`);
  return res.json();
}

export async function getPointsBalance(userId: string) {
  const res = await fetch(`${BASE}/points/balance/${encodeURIComponent(userId)}`);
  return res.json();
}

export async function getRewards() {
  const res = await fetch(`${BASE}/points/rewards`);
  return res.json();
}

export async function submitVerification(input: {
  userId: string;
  facility: string;
  claim: "clear" | "broken" | "crowded";
  evidencePhotoProvided: boolean;
  userPos: { lat: number; lng: number };
  targetPos: { lat: number; lng: number };
}) {
  const res = await fetch(`${BASE}/points/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function redeemReward(userId: string, rewardId: string) {
  const res = await fetch(`${BASE}/points/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, rewardId }),
  });
  return res.json();
}

export async function awardNudgeFollowed(userId: string) {
  const res = await fetch(`${BASE}/points/nudge-followed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}
