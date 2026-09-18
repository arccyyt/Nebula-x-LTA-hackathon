export interface LiftStatus {
  station: string;
  exitId: string;
  exitLabel: string;
  status: "faulty"; // the real v2/FacilitiesMaintenance feed only ever lists lifts currently under maintenance -- there is no "operational" record to receive
  description: string;
}

// v2/FacilitiesMaintenance's real fields, confirmed via LTA's published API
// guide: Line, StationCode, StationName, LiftID (optional), LiftDesc (free
// text, e.g. "Exit B Street level - Concourse"). It is an ad-hoc list of
// lifts *currently* under maintenance, not a full status table -- absence
// of a station here means "no known fault", not "confirmed working".
export interface RawLiftMaintenanceRecord {
  Line: string;
  StationCode: string;
  StationName: string;
  LiftID?: string;
  LiftDesc?: string;
}

export function normalizeLiftRecords(records: RawLiftMaintenanceRecord[]): LiftStatus[] {
  return records.map((r) => ({
    station: r.StationName,
    exitId: r.LiftID ?? `${r.StationCode}-unknown`,
    exitLabel: r.LiftDesc ?? "Lift",
    status: "faulty",
    description: r.LiftDesc ? `${r.LiftDesc} -- under maintenance.` : "Lift under maintenance.",
  }));
}

// The Outram Park / SGH lift is deliberately down here to drive the
// accessibility-persona demo: Mdm Lim's usual exit lift is broken, so the
// planner must reroute her rather than just report a fault.
export const LIFT_STATUS: LiftStatus[] = [
  { station: "Outram Park", exitId: "EW16-3", exitLabel: "Exit 3 (towards SGH)", status: "faulty", description: "Lift serving Exit 3 under maintenance, expected back 6pm today." },
];
