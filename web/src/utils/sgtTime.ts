/** Builds an ISO instant for "today at HH:MM Singapore time (+shiftMinutes)", independent of the device's own timezone. */
export function sgtIsoFromTimeString(timeHHMM: string, shiftMinutes = 0): string {
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const nowUtcMs = Date.now();
  const sgtNow = new Date(nowUtcMs + 8 * 3600 * 1000);
  const y = sgtNow.getUTCFullYear();
  const m = sgtNow.getUTCMonth() + 1;
  const d = sgtNow.getUTCDate();
  const totalMin = (hh || 0) * 60 + (mm || 0) + shiftMinutes;
  const hh2 = Math.floor(totalMin / 60) % 24;
  const mm2 = ((totalMin % 60) + 60) % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh2)}:${pad(mm2)}:00+08:00`;
}
