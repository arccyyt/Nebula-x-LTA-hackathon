export type Mobility = "standard" | "wheelchair" | "stroller";
export type Persona = "rachel" | "arjun" | "mdmlim" | "custom";
export type LegStatus = "normal" | "disrupted" | "exposed" | "sheltered";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface WalkStep {
  instruction: string;
  distanceMeters: number;
  minutes: number;
  effort: "flat" | "gentle-slope" | "steep-slope";
}

export interface BunchingAlert {
  service: string;
  skipBus: { arrivalMin: number; load: string };
  boardBus: { arrivalMin: number; load: string; wheelchairAccessible: boolean };
}

export interface ItineraryLeg {
  kind: "walk" | "transit" | "bus-bridge";
  label: string;
  line?: string;
  color: string;
  fromLabel: string;
  toLabel: string;
  minutes: number;
  meters?: number;
  status: LegStatus;
  note?: string;
  path: LatLng[];
  steps?: WalkStep[];
  bunching?: BunchingAlert | null;
}

export interface PlanResult {
  persona: Persona;
  mobility: Mobility;
  origin: { label: string; pos: LatLng };
  destination: { label: string; pos: LatLng };
  departAt: string;
  eta: { minMin: number; typicalMin: number; maxMin: number };
  legs: ItineraryLeg[];
  alternative?: { legs: ItineraryLeg[]; totalMinutes: number; deltaVsPrimaryMin: number; reason: string };
  disruption?: { line: string; stations: string[]; message: string; freeBusStations: string[]; etaDeltaMin: number };
  crowdNudge?: { station: string; time: string; level: string; shiftMinutes: number; newLevel: string };
  liftReroute?: { originalStation: string; exit: string; reroutedTo: string; wabService?: string };
  weatherNote?: string;
  ai: { action: string; bullets: string[]; source: "gemini" | "rule-fallback" };
  dataSources: Record<string, "live" | "demo-fixture">;
  pointsEarnable: number;
}

export interface PersonaPreset {
  id: Persona;
  name: string;
  tagline: string;
  originPostal: string;
  destPostal: string;
  mobility: Mobility;
  defaultDepartTime: string;
  fontScaleDefault: number;
}

export const PERSONAS: PersonaPreset[] = [
  {
    id: "rachel",
    name: "Rachel",
    tagline: "Fixed schedule -- Tampines to Raffles Place, desk by 08:45",
    originPostal: "529510",
    destPostal: "048623",
    mobility: "standard",
    defaultDepartTime: "07:40",
    fontScaleDefault: 1,
  },
  {
    id: "arjun",
    name: "Arjun",
    tagline: "Flexible start -- Punggol to one-north, optimises for comfort",
    originPostal: "828761",
    destPostal: "138567",
    mobility: "standard",
    defaultDepartTime: "08:15",
    fontScaleDefault: 1,
  },
  {
    id: "mdmlim",
    name: "Mdm Lim",
    tagline: "Accessibility -- Bedok to SGH, wheelchair, needs lifts",
    originPostal: "469660",
    destPostal: "169608",
    mobility: "wheelchair",
    defaultDepartTime: "10:30",
    fontScaleDefault: 1.35,
  },
];
