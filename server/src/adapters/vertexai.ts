import type { Sourced } from "./types.js";

export interface NarrativeContext {
  persona: string;
  disruption?: { line: string; stations: string[]; message: string; freeBusStations: string[] };
  rain?: { area: string; forecast: string };
  crowd?: { station: string; level: string; time: string };
  bunching?: { service: string; skipArrivalMin: number; boardArrivalMin: number };
  lift?: { station: string; exit: string; faulty: boolean };
  etaDeltaMin: number;
  mobility: string;
}

export interface Narrative {
  action: string;
  bullets: string[];
  source: "gemini" | "rule-fallback";
}

const SYSTEM_PROMPT = `You are a transit copilot. Analyze the disruption, alternate bus options, and rain forecast. Output exactly ONE imperative action sentence with ETA difference, followed by 3 concise bullet points. No generic filler.`;

export async function generateNarrative(ctx: NarrativeContext): Promise<Sourced<Narrative>> {
  const apiKey = process.env.GEMINI_API_KEY;
  const vertexToken = process.env.VERTEX_ACCESS_TOKEN;
  const project = process.env.GOOGLE_CLOUD_PROJECT;

  const userPrompt = `${SYSTEM_PROMPT}\n\nCommuter persona: ${ctx.persona} (mobility: ${ctx.mobility})\nStructured context (JSON): ${JSON.stringify(ctx)}\n\nRespond as JSON: {"action": string, "bullets": [string, string, string]}`;

  try {
    if (apiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] }),
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!res.ok) throw new Error(`Gemini API -> HTTP ${res.status}`);
      const json = (await res.json()) as { candidates: [{ content: { parts: [{ text: string }] } }] };
      const text = json.candidates[0].content.parts[0].text;
      const parsed = extractJson(text);
      if (parsed) return { data: { ...parsed, source: "gemini" }, source: "live" };
    } else if (vertexToken && project) {
      const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
      const model = process.env.VERTEX_MODEL || "gemini-1.5-flash";
      const res = await fetch(
        `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${vertexToken}`, "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: userPrompt }] }] }),
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!res.ok) throw new Error(`Vertex AI -> HTTP ${res.status}`);
      const json = (await res.json()) as { candidates: [{ content: { parts: [{ text: string }] } }] };
      const text = json.candidates[0].content.parts[0].text;
      const parsed = extractJson(text);
      if (parsed) return { data: { ...parsed, source: "gemini" }, source: "live" };
    }
  } catch {
    // fall through to rule-based generator below
  }

  return { data: ruleBasedNarrative(ctx), source: "demo-fixture", note: "No Vertex AI / Gemini credentials configured -- using rule-based fallback with the same output contract." };
}

function extractJson(text: string): { action: string; bullets: string[] } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.action === "string" && Array.isArray(obj.bullets)) return obj;
  } catch {
    /* ignore */
  }
  return null;
}

function ruleBasedNarrative(ctx: NarrativeContext): Narrative {
  const bullets: string[] = [];
  let action: string;

  if (ctx.disruption) {
    const busNote = ctx.disruption.freeBusStations.length
      ? `free bus boarding at ${ctx.disruption.freeBusStations.join(" & ")}`
      : "no free-bus mitigation active";
    action = `Take the free bus bridge around ${ctx.disruption.line} ${ctx.disruption.stations.join("-")}, +${ctx.etaDeltaMin} min today.`;
    bullets.push(`${ctx.disruption.line} disrupted: ${ctx.disruption.stations.join(", ")} -- ${busNote}.`);
  } else if (ctx.bunching) {
    action = `Skip the ${ctx.bunching.skipArrivalMin}-min bus, board the one ${ctx.bunching.boardArrivalMin} min behind with seats.`;
    bullets.push(`Lead ${ctx.bunching.service} bus is standing-only; trailing bus has seats.`);
  } else if (ctx.crowd && ctx.crowd.level === "h") {
    action = `Shift departure 15 min later to drop ${ctx.crowd.station} platform crowding from High to Moderate.`;
    bullets.push(`Forecast crowd at ${ctx.crowd.station} around ${ctx.crowd.time}: High.`);
  } else if (ctx.lift?.faulty) {
    action = `Lift at ${ctx.lift.station} Exit ${ctx.lift.exit} is down -- use the rerouted exit with a working lift.`;
    bullets.push(`${ctx.lift.station} Exit ${ctx.lift.exit} lift: under maintenance today.`);
  } else {
    action = `Your usual route is running normally, +0 min expected.`;
    bullets.push("No active disruption on your line.");
  }

  if (ctx.rain) bullets.push(`${ctx.rain.area}: ${ctx.rain.forecast} -- sheltered path applied where available.`);
  while (bullets.length < 3) bullets.push("No further advisories for this leg.");
  return { action, bullets: bullets.slice(0, 3), source: "rule-fallback" };
}
