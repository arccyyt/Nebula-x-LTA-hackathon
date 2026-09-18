import type { PlanResult } from "../types";

export default function LiftStatusCard({ liftReroute }: { liftReroute: NonNullable<PlanResult["liftReroute"]> }) {
  return (
    <div className="card" style={{ borderColor: "var(--color-danger)" }}>
      <h3 style={{ color: "var(--color-danger)" }}>&#9888; Lift out of service</h3>
      <p className="leg-sub">
        The lift at <strong>{liftReroute.originalStation}</strong>, {liftReroute.exit}, is under maintenance.
        We've rerouted you via <strong>{liftReroute.reroutedTo}</strong>{liftReroute.wabService ? ` with wheelchair-accessible bus ${liftReroute.wabService}` : ""}.
      </p>
    </div>
  );
}
