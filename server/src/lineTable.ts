export interface LineInfo {
  canonical: string;
  name: string;
  alertsCode: string;
  crowdCode: string;
  color: string;
}

// Canonical line table -- the same physical line has different codes across
// DataMall endpoints (TrainServiceAlerts vs PCDRealTime/PCDForecast). Every
// lookup in this app goes through `canonical`, never a raw API code, so the
// STL/SLRT, PTL/PLRT, CCL+CEL and EWL+CGL mismatches called out in the brief
// can't silently break a join.
export const LINES: LineInfo[] = [
  { canonical: "NSL", name: "North South Line", alertsCode: "NSL", crowdCode: "NSL", color: "#D42E12" },
  { canonical: "EWL", name: "East West Line", alertsCode: "EWL", crowdCode: "EWL", color: "#009645" },
  { canonical: "CGL", name: "Changi Extension", alertsCode: "EWL", crowdCode: "CGL", color: "#009645" },
  { canonical: "NEL", name: "North East Line", alertsCode: "NEL", crowdCode: "NEL", color: "#9900AA" },
  { canonical: "CCL", name: "Circle Line", alertsCode: "CCL", crowdCode: "CCL", color: "#FA9E0D" },
  { canonical: "CEL", name: "Circle Line Extension", alertsCode: "CCL", crowdCode: "CEL", color: "#FA9E0D" },
  { canonical: "DTL", name: "Downtown Line", alertsCode: "DTL", crowdCode: "DTL", color: "#005EC4" },
  { canonical: "TEL", name: "Thomson-East Coast Line", alertsCode: "TEL", crowdCode: "TEL", color: "#9D5B25" },
  { canonical: "BPLRT", name: "Bukit Panjang LRT", alertsCode: "BPL", crowdCode: "BPL", color: "#748477" },
  { canonical: "SKLRT", name: "Sengkang LRT", alertsCode: "STL", crowdCode: "SLRT", color: "#748477" },
  { canonical: "PGLRT", name: "Punggol LRT", alertsCode: "PTL", crowdCode: "PLRT", color: "#748477" },
];

export function lineByAlertsCode(code: string): LineInfo | undefined {
  return LINES.find((l) => l.alertsCode === code);
}

export function lineByCanonical(code: string): LineInfo | undefined {
  return LINES.find((l) => l.canonical === code);
}
