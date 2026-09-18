export interface BusArrival {
  ServiceNo: string;
  Load: "SEA" | "SDA" | "LSD"; // seats available / standing available / limited standing
  Feature: "WAB" | "";
  Type: "SD" | "DD" | "BD";
  EstimatedArrivalMin: number;
}

export interface BusStopArrivals {
  BusStopCode: string;
  Description: string;
  Services: BusArrival[];
}

// v3/BusArrival shape (per stop, Load/Feature/Type per arriving bus). The
// 970 stop near SGH/Outram Park is seeded with the classic bunching pattern:
// a nearly-full lead bus 1 min out, followed by a near-empty bus 60s later.
export const BUS_STOPS: Record<string, BusStopArrivals> = {
  "10009": {
    BusStopCode: "10009",
    Description: "Outram Park Stn / SGH",
    Services: [
      { ServiceNo: "970", Load: "LSD", Feature: "WAB", Type: "DD", EstimatedArrivalMin: 1 },
      { ServiceNo: "970", Load: "SEA", Feature: "WAB", Type: "SD", EstimatedArrivalMin: 2 },
      { ServiceNo: "63", Load: "SDA", Feature: "WAB", Type: "SD", EstimatedArrivalMin: 6 },
    ],
  },
  "75009": {
    BusStopCode: "75009",
    Description: "Bedok Stn Exit A",
    Services: [
      { ServiceNo: "17", Load: "SDA", Feature: "WAB", Type: "SD", EstimatedArrivalMin: 3 },
      { ServiceNo: "18", Load: "SEA", Feature: "", Type: "SD", EstimatedArrivalMin: 9 },
    ],
  },
};

export interface BunchingAlert {
  service: string;
  skipBus: { arrivalMin: number; load: string };
  boardBus: { arrivalMin: number; load: string; wheelchairAccessible: boolean };
}

export function detectBunching(stop: BusStopArrivals): BunchingAlert | null {
  const byService = new Map<string, BusArrival[]>();
  for (const b of stop.Services) {
    if (!byService.has(b.ServiceNo)) byService.set(b.ServiceNo, []);
    byService.get(b.ServiceNo)!.push(b);
  }
  for (const [service, buses] of byService) {
    if (buses.length < 2) continue;
    const sorted = [...buses].sort((a, b) => a.EstimatedArrivalMin - b.EstimatedArrivalMin);
    const [lead, trail] = sorted;
    const leadFull = lead.Load === "LSD";
    const trailHasSeats = trail.Load === "SEA" || trail.Load === "SDA";
    if (leadFull && trailHasSeats && trail.EstimatedArrivalMin - lead.EstimatedArrivalMin <= 4) {
      return {
        service,
        skipBus: { arrivalMin: lead.EstimatedArrivalMin, load: lead.Load },
        boardBus: { arrivalMin: trail.EstimatedArrivalMin, load: trail.Load, wheelchairAccessible: trail.Feature === "WAB" },
      };
    }
  }
  return null;
}
