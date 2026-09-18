export type WalkMode = "standard" | "wheelchair" | "stroller";

interface WalkSample {
  mode: WalkMode;
  metersPerMinute: number;
  at: string;
}

const KEY = "scc.walkSamples.v1";
const MAX_SAMPLES = 40;

const DEFAULT_SPEED: Record<WalkMode, number> = { standard: 80, wheelchair: 45, stroller: 60 };

function readSamples(): WalkSample[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WalkSample[]) : [];
  } catch {
    return [];
  }
}

function writeSamples(samples: WalkSample[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {
    /* ignore -- learned speed just won't persist */
  }
}

/** Record a completed walk. Anything faster than ~2x the default pace is treated as jogging/running and excluded, so a sprint for a closing train door doesn't skew the "must leave by" estimate. */
export function recordWalk(mode: WalkMode, distanceMeters: number, seconds: number) {
  if (seconds <= 0 || distanceMeters <= 0) return;
  const metersPerMinute = distanceMeters / (seconds / 60);
  if (metersPerMinute > DEFAULT_SPEED[mode] * 2.2) return; // looks like running, not a walk sample
  const samples = readSamples();
  samples.push({ mode, metersPerMinute, at: new Date().toISOString() });
  writeSamples(samples);
}

export function getLearnedSpeed(mode: WalkMode): number {
  const samples = readSamples().filter((s) => s.mode === mode);
  if (samples.length === 0) return DEFAULT_SPEED[mode];
  const avg = samples.reduce((sum, s) => sum + s.metersPerMinute, 0) / samples.length;
  return Math.round(avg);
}

export function classifyPace(metersPerMinute: number): "strolling" | "walking" | "brisk" {
  if (metersPerMinute < 55) return "strolling";
  if (metersPerMinute < 100) return "walking";
  return "brisk";
}

export function sampleCount(mode: WalkMode): number {
  return readSamples().filter((s) => s.mode === mode).length;
}
