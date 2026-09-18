import { useSettings, type Language } from "../state/settings";

const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "ms", label: "Bahasa Melayu" },
  { id: "ta", label: "தமிழ்" },
];

export default function AccessibilityControls({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();

  return (
    <div className="bottom-sheet" role="dialog" aria-label="Accessibility settings">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Display &amp; accessibility</h3>
        <button onClick={onClose} aria-label="Close">Close</button>
      </div>

      <div className="field-row" style={{ marginTop: 14 }}>
        <label>Text size</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => update({ fontScale: Math.max(0.9, settings.fontScale - 0.15) })} aria-label="Smaller text">A-</button>
          <span style={{ alignSelf: "center", minWidth: 48, textAlign: "center" }}>{Math.round(settings.fontScale * 100)}%</span>
          <button onClick={() => update({ fontScale: Math.min(1.8, settings.fontScale + 0.15) })} aria-label="Larger text">A+</button>
        </div>
      </div>

      <div className="field-row" style={{ marginTop: 14 }}>
        <label htmlFor="contrast">High contrast</label>
        <button
          id="contrast"
          onClick={() => update({ highContrast: !settings.highContrast })}
          aria-pressed={settings.highContrast}
        >
          {settings.highContrast ? "On -- tap to turn off" : "Off -- tap to turn on"}
        </button>
      </div>

      <div className="field-row" style={{ marginTop: 14 }}>
        <label htmlFor="lang">Language</label>
        <select id="lang" value={settings.language} onChange={(e) => update({ language: e.target.value as Language })}>
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <div className="leg-sub" style={{ marginTop: 4 }}>Demo scope: language selection is stored and shown in the tutorial; full UI translation is future work (see write-up).</div>
      </div>

      <div className="field-row" style={{ marginTop: 14 }}>
        <label htmlFor="sound">Walking-mode cues</label>
        <button id="sound" onClick={() => update({ soundOn: !settings.soundOn })} aria-pressed={settings.soundOn}>
          {settings.soundOn ? "Sound + vibration" : "Vibration only (muted)"}
        </button>
      </div>
    </div>
  );
}
