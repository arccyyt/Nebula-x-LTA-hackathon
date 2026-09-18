export interface AffectedSegment {
  Line: string;
  Direction: string;
  Stations: string; // comma separated station codes, matching the live feed's shape
  FreePublicBus: string;
  FreeMRTShuttle: string;
  MRTShuttleDirection: string;
}

export interface TrainServiceAlertsResponse {
  Status: 1 | 2;
  AffectedSegments: AffectedSegment[];
  Message: { Content: string; CreatedDate: string }[];
}

export const NORMAL_DAY_ALERTS: TrainServiceAlertsResponse = {
  Status: 1,
  AffectedSegments: [],
  Message: [
    { Content: "Free bus service to be provided to/from Aljunied MRT and Kallang MRT stations by way of Circle Line stations owing to essential engineering works on 21 Sep, 0100-0430hrs.", CreatedDate: "2026-09-17 21:00:00" },
  ],
};

// Labelled INJECTED DEMO DATA per the brief's allowance in 2.6: real feeds are
// quiet on an ordinary day, so a signalling-fault scenario is replayed here
// to exercise the disruption-response path end to end. Toggle via
// POST /api/demo/disruption.
export const INJECTED_DISRUPTION_ALERTS: TrainServiceAlertsResponse = {
  Status: 2,
  AffectedSegments: [
    {
      Line: "EWL",
      Direction: "Both",
      Stations: "EW14,EW15,EW16",
      FreePublicBus: "EW14,EW16",
      FreeMRTShuttle: "None",
      MRTShuttleDirection: "",
    },
  ],
  Message: [
    {
      Content: "Signalling fault between Raffles Place and Outram Park. Free bus boarding available at Raffles Place and Outram Park stations. Add 15-20 min to your journey.",
      CreatedDate: new Date().toISOString(),
    },
  ],
};

export const DEMO_META = {
  injected: true,
  note: "Sample disruption injected for demo purposes (signalling fault, EWL, Raffles Place - Outram Park). TrainServiceAlerts.AffectedSegments is empty on an ordinary day; this replays a realistic scenario as permitted by the brief.",
};
