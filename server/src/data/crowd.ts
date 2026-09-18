export type CrowdLevel = "l" | "m" | "h" | "NA";

const SGT_OFFSET_MS = 8 * 3600 * 1000;

/** Minute-of-day in Singapore time for an absolute instant, independent of the server's own timezone. */
function sgtMinutesSinceMidnight(date: Date): number {
  const sgtMs = date.getTime() + SGT_OFFSET_MS;
  return Math.floor((sgtMs % 86400000) / 60000);
}

/** The UTC instant corresponding to a given SGT minute-of-day on the same calendar day as `reference`. */
function sgtSlotToDate(reference: Date, minutesSGT: number): Date {
  const sgtMs = reference.getTime() + SGT_OFFSET_MS;
  const sgtMidnightMs = Math.floor(sgtMs / 86400000) * 86400000;
  return new Date(sgtMidnightMs + minutesSGT * 60000 - SGT_OFFSET_MS);
}

function peakCurveLevel(minutesSinceMidnightSGT: number): CrowdLevel {
  const t = minutesSinceMidnightSGT;
  if (t >= 450 && t < 510) return "h"; // 07:30-08:30
  if ((t >= 420 && t < 450) || (t >= 510 && t < 540)) return "m"; // 07:00-07:30, 08:30-09:00
  if (t >= 1020 && t < 1110) return "h"; // 17:00-18:30 evening peak
  if (t >= 990 && t < 1020) return "m";
  return "l";
}

export interface CrowdReading {
  Station: string;
  StartTime: string;
  EndTime: string;
  CrowdLevel: CrowdLevel;
}

export function getRealtimeCrowd(stationCode: string, at: Date, forceHigh = false): CrowdReading {
  const minuteOfDay = sgtMinutesSinceMidnight(at);
  const slotStartMinute = Math.floor(minuteOfDay / 10) * 10;
  const start = sgtSlotToDate(at, slotStartMinute);
  const end = new Date(start.getTime() + 10 * 60000);
  return {
    Station: stationCode,
    StartTime: start.toISOString(),
    EndTime: end.toISOString(),
    CrowdLevel: forceHigh ? "h" : peakCurveLevel(slotStartMinute),
  };
}

export function getForecastSlots(stationCode: string, day: Date, fromMin = 420, toMin = 600): CrowdReading[] {
  const slots: CrowdReading[] = [];
  for (let t = fromMin; t < toMin; t += 30) {
    const start = sgtSlotToDate(day, t);
    const end = new Date(start.getTime() + 30 * 60000);
    slots.push({
      Station: stationCode,
      StartTime: start.toISOString(),
      EndTime: end.toISOString(),
      CrowdLevel: peakCurveLevel(t),
    });
  }
  return slots;
}
