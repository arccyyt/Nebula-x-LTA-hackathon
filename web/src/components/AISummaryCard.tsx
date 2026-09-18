import type { PlanResult } from "../types";

export default function AISummaryCard({ plan }: { plan: PlanResult }) {
  return (
    <div className="ai-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <strong style={{ fontSize: "0.8rem", opacity: 0.85 }}>TRANSIT COPILOT</strong>
        <span className={`badge ${plan.ai.source === "gemini" ? "live" : "demo"}`} style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}>
          {plan.ai.source === "gemini" ? "Gemini" : "Rule-based fallback"}
        </span>
      </div>
      <div className="action">{plan.ai.action}</div>
      <ul>
        {plan.ai.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
