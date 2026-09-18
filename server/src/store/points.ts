import { haversineMeters, type LatLng } from "../lib/geo.js";

export interface UserAccount {
  userId: string;
  points: number;
  wrongReports: number;
  totalReports: number;
  bannedUntil: string | null;
}

export interface Submission {
  id: string;
  userId: string;
  facility: string;
  claim: "clear" | "broken" | "crowded";
  createdAt: string;
  awardedPoints: number;
  markedWrong: boolean;
}

export interface Reward {
  id: string;
  label: string;
  cost: number;
  partner: string;
}

// Small enough that a plain photo-taken + on-site geolocation check is the
// anti-troll gate, per the brief's ask: not "trust everyone" but not a full
// moderation pipeline either. 5 contradicted reports in the trailing 30 days
// -> temporary ban, matching the brief's own "within 5 wrongful info" rule.
const WRONG_REPORT_BAN_THRESHOLD = 5;
const BAN_DURATION_DAYS = 30;
const PROXIMITY_METERS = 150;
const POINTS_PER_VERIFICATION = 10;
const POINTS_PER_NUDGE_FOLLOWED = 30;

export const REWARDS: Reward[] = [
  { id: "simplygo-030", label: "$0.30 SimplyGo fare credit", cost: 30, partner: "SimplyGo" },
  { id: "toastbox-voucher", label: "Toast Box beverage voucher", cost: 80, partner: "Toast Box" },
  { id: "fairprice-1", label: "$1 FairPrice voucher", cost: 100, partner: "FairPrice" },
  { id: "7-11-050", label: "$0.50 7-Eleven credit", cost: 50, partner: "7-Eleven" },
];

const accounts = new Map<string, UserAccount>();
const submissions: Submission[] = [];

function getOrCreate(userId: string): UserAccount {
  let acc = accounts.get(userId);
  if (!acc) {
    acc = { userId, points: 0, wrongReports: 0, totalReports: 0, bannedUntil: null };
    accounts.set(userId, acc);
  }
  return acc;
}

export function isBanned(acc: UserAccount): boolean {
  return !!acc.bannedUntil && new Date(acc.bannedUntil) > new Date();
}

export function balance(userId: string): UserAccount {
  return getOrCreate(userId);
}

export interface VerifyInput {
  userId: string;
  facility: string;
  claim: "clear" | "broken" | "crowded";
  evidencePhotoProvided: boolean;
  userPos: LatLng;
  targetPos: LatLng;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  account: UserAccount;
  submission?: Submission;
}

export function submitVerification(input: VerifyInput): VerifyResult {
  const acc = getOrCreate(input.userId);
  if (isBanned(acc)) {
    return { ok: false, reason: `Reporting suspended until ${acc.bannedUntil} after repeated inaccurate reports.`, account: acc };
  }
  if (!input.evidencePhotoProvided) {
    return { ok: false, reason: "A photo taken on-site is required before a report can earn points.", account: acc };
  }
  const distance = haversineMeters(input.userPos, input.targetPos);
  if (distance > PROXIMITY_METERS) {
    return { ok: false, reason: `You need to be within ${PROXIMITY_METERS}m of the facility to report on it (you are ~${Math.round(distance)}m away).`, account: acc };
  }

  const submission: Submission = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    facility: input.facility,
    claim: input.claim,
    createdAt: new Date().toISOString(),
    awardedPoints: POINTS_PER_VERIFICATION,
    markedWrong: false,
  };
  submissions.push(submission);
  acc.points += POINTS_PER_VERIFICATION;
  acc.totalReports += 1;
  return { ok: true, account: acc, submission };
}

/** Called when a later official signal (TrainServiceAlerts / FacilitiesMaintenance) contradicts a submission. */
export function markSubmissionWrong(submissionId: string): VerifyResult | null {
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return null;
  sub.markedWrong = true;
  const acc = getOrCreate(sub.userId);
  acc.wrongReports += 1;
  acc.points = Math.max(0, acc.points - sub.awardedPoints);
  if (acc.wrongReports >= WRONG_REPORT_BAN_THRESHOLD) {
    const until = new Date();
    until.setDate(until.getDate() + BAN_DURATION_DAYS);
    acc.bannedUntil = until.toISOString();
  }
  return { ok: true, account: acc, submission: sub };
}

export function awardNudgeFollowed(userId: string): UserAccount {
  const acc = getOrCreate(userId);
  acc.points += POINTS_PER_NUDGE_FOLLOWED;
  return acc;
}

export function redeem(userId: string, rewardId: string): { ok: boolean; reason?: string; account: UserAccount; code?: string } {
  const acc = getOrCreate(userId);
  const reward = REWARDS.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, reason: "Unknown reward.", account: acc };
  if (acc.points < reward.cost) return { ok: false, reason: `Need ${reward.cost} points, you have ${acc.points}.`, account: acc };
  acc.points -= reward.cost;
  const code = `TP-${reward.id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return { ok: true, account: acc, code };
}

export function submissionsFor(userId: string): Submission[] {
  return submissions.filter((s) => s.userId === userId);
}
