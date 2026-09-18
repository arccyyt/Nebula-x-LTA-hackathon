export interface LiftStatus {
  station: string;
  exitId: string;
  exitLabel: string;
  status: "operational" | "faulty";
  description: string;
}

// Mirrors v2/FacilitiesMaintenance shape (station, lift, exit served, status).
// The Outram Park / SGH lift is deliberately down here to drive the
// accessibility-persona demo: Mdm Lim's usual exit lift is broken, so the
// planner must reroute her rather than just report a fault.
export const LIFT_STATUS: LiftStatus[] = [
  { station: "Outram Park", exitId: "EW16-3", exitLabel: "Exit 3 (towards SGH)", status: "faulty", description: "Lift serving Exit 3 under maintenance, expected back 6pm today." },
  { station: "Outram Park", exitId: "EW16-1", exitLabel: "Exit 1", status: "operational", description: "Operational." },
  { station: "Tiong Bahru", exitId: "EW17-1", exitLabel: "Exit A", status: "operational", description: "Operational." },
  { station: "Raffles Place", exitId: "EW14-1", exitLabel: "Exit A (Republic Plaza)", status: "operational", description: "Operational." },
];

export function liftsForStation(stationName: string): LiftStatus[] {
  return LIFT_STATUS.filter((l) => l.station === stationName);
}

export function hasWorkingLift(stationName: string): boolean {
  const lifts = liftsForStation(stationName);
  if (lifts.length === 0) return true; // no data => assume fine, avoid false alarms
  return lifts.some((l) => l.status === "operational");
}
