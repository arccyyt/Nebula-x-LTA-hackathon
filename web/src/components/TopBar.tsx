import { useSettings } from "../state/settings";
import { PERSONAS } from "../types";
import { useOnline } from "../utils/useOnline";

export default function TopBar({ onOpenAccessibility, onOpenPoints }: { onOpenAccessibility: () => void; onOpenPoints: () => void }) {
  const { settings, setPersona } = useSettings();
  const online = useOnline();

  return (
    <div className="topbar">
      <span className="topbar-title">🚉 Commute Companion</span>
      <span className={`badge ${online ? "live" : "demo"}`} title={online ? "Online" : "Offline -- showing cached data"}>
        {online ? "Online" : "Offline"}
      </span>
      <button onClick={onOpenPoints} aria-label="TransitPoints">⭐ Points</button>
      <button onClick={onOpenAccessibility} aria-label="Accessibility settings">Aa ⚙</button>
      <div className="persona-switcher" style={{ width: "100%" }} role="tablist" aria-label="Judge as persona">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={settings.persona === p.id}
            className={`persona-chip ${settings.persona === p.id ? "active" : ""}`}
            onClick={() => setPersona(p.id)}
            title={p.tagline}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
