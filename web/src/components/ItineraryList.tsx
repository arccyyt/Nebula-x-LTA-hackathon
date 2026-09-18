import { useState } from "react";
import type { ItineraryLeg, PlanResult } from "../types";

const KIND_ICON: Record<ItineraryLeg["kind"], string> = {
  walk: "🚶",
  transit: "🚆",
  "bus-bridge": "🚌",
};

function LegRow({ leg, onStartWalking }: { leg: ItineraryLeg; onStartWalking?: (leg: ItineraryLeg) => void }) {
  return (
    <div className="leg-row">
      <span className="leg-rail" style={{ background: leg.color }} />
      <div className="leg-body">
        <div className="leg-title">
          {KIND_ICON[leg.kind]} {leg.label}
          {leg.status !== "normal" && <span className={`status-pill ${leg.status}`} style={{ marginLeft: 8 }}>{leg.status}</span>}
        </div>
        <div className="leg-sub">
          {leg.fromLabel} &rarr; {leg.toLabel} &middot; {leg.minutes} min
          {leg.meters ? ` · ${leg.meters} m` : ""}
        </div>
        {leg.note && <div className="leg-sub" style={{ marginTop: 2 }}>{leg.note}</div>}
        {leg.steps && leg.steps.length > 0 && (
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            {leg.steps.map((s, i) => (
              <li key={i}>
                {s.instruction} &middot; {s.distanceMeters}m{s.effort !== "flat" ? ` · ${s.effort.replace("-", " ")}` : ""}
              </li>
            ))}
          </ul>
        )}
        {leg.kind === "walk" && onStartWalking && (
          <button onClick={() => onStartWalking(leg)} style={{ marginTop: 8 }}>Start walking mode</button>
        )}
        {leg.bunching && (
          <div className="nudge-card" style={{ marginTop: 8 }}>
            <strong>Skip that bus.</strong> Service {leg.bunching.service} arriving in {leg.bunching.skipBus.arrivalMin} min is standing-only ({leg.bunching.skipBus.load}).
            The one {leg.bunching.boardBus.arrivalMin} min behind has seats ({leg.bunching.boardBus.load}){leg.bunching.boardBus.wheelchairAccessible ? ", wheelchair-accessible" : ""}.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ItineraryList({ plan, onStartWalking }: { plan: PlanResult; onStartWalking?: (leg: ItineraryLeg) => void }) {
  const [showAlt, setShowAlt] = useState(false);
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3>Your journey</h3>
        <span className="leg-sub">{plan.eta.minMin}&ndash;{plan.eta.maxMin} min</span>
      </div>
      {plan.legs.map((leg, i) => (
        <LegRow key={i} leg={leg} onStartWalking={onStartWalking} />
      ))}

      {plan.alternative && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setShowAlt((v) => !v)} style={{ width: "100%" }}>
            {showAlt ? "Hide" : "Compare"} alternative ({plan.alternative.deltaVsPrimaryMin <= 0 ? "" : "+"}
            {plan.alternative.deltaVsPrimaryMin} min vs current route)
          </button>
          {showAlt && (
            <div style={{ marginTop: 10, borderTop: "1px dashed var(--color-border)", paddingTop: 10 }}>
              <div className="leg-sub" style={{ marginBottom: 6 }}>{plan.alternative.reason} &middot; total {plan.alternative.totalMinutes} min</div>
              {plan.alternative.legs.map((leg, i) => (
                <LegRow key={i} leg={leg} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
