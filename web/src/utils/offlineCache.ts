import type { PlanResult } from "../types";

const KEY = "scc.cachedTicket.v1";

export interface CachedTicket {
  savedAt: string;
  plan: PlanResult;
  textCard: string;
}

export function renderTextCard(plan: PlanResult): string {
  const lines: string[] = [];
  lines.push(`COMMUTE TICKET -- ${new Date(plan.departAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`);
  lines.push(`${plan.origin.label}  ->  ${plan.destination.label}`);
  lines.push(`ETA ${plan.eta.minMin}-${plan.eta.maxMin} min (typical ${plan.eta.typicalMin})`);
  lines.push("");
  plan.legs.forEach((leg, i) => {
    lines.push(`${i + 1}. [${leg.kind.toUpperCase()}] ${leg.fromLabel} -> ${leg.toLabel} (${leg.minutes} min)${leg.status !== "normal" ? ` [${leg.status.toUpperCase()}]` : ""}`);
    if (leg.note) lines.push(`   ${leg.note}`);
    leg.steps?.forEach((s) => lines.push(`   - ${s.instruction}, ${s.distanceMeters}m`));
  });
  if (plan.ai) {
    lines.push("");
    lines.push(`COPILOT: ${plan.ai.action}`);
  }
  return lines.join("\n");
}

export function saveTicket(plan: PlanResult) {
  const ticket: CachedTicket = { savedAt: new Date().toISOString(), plan, textCard: renderTextCard(plan) };
  try {
    localStorage.setItem(KEY, JSON.stringify(ticket));
  } catch {
    /* storage unavailable -- offline ticket just won't persist this session */
  }
  return ticket;
}

export function loadTicket(): CachedTicket | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedTicket) : null;
  } catch {
    return null;
  }
}
