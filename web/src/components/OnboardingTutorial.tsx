import { useState } from "react";
import { useSettings, type Language } from "../state/settings";

const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "ms", label: "Bahasa Melayu" },
  { id: "ta", label: "தமிழ்" },
];

const SLIDES = [
  { title: "Plan your trip", body: "Type where you're going, then tap the big blue button." },
  { title: "Follow the steps", body: "Each step of your journey is shown one at a time, with how far to walk." },
  { title: "Get help & rewards", body: "Tap the star for TransitPoints, or ask for help any time via Settings." },
];

export default function OnboardingTutorial({ onDone }: { onDone: () => void }) {
  const { settings, update } = useSettings();
  const [stage, setStage] = useState<"age" | "slides">("age");
  const [slide, setSlide] = useState(0);
  const [age, setAge] = useState("");

  const confirmAge = () => {
    const n = parseInt(age, 10);
    const isElderly = !Number.isNaN(n) && n >= 60;
    update({ age: Number.isNaN(n) ? null : n, fontScale: isElderly ? 1.5 : settings.fontScale });
    setStage("slides");
  };

  const finish = () => {
    update({ onboardingDone: true });
    onDone();
  };

  if (stage === "age") {
    return (
      <div className="tutorial-overlay">
        <h1 style={{ fontSize: "1.8rem" }}>Welcome 👋</h1>
        <p style={{ fontSize: "1.15rem" }}>To make the text the right size for you, what's your age?</p>
        <input
          type="number"
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          style={{ fontSize: "1.3rem", padding: 14 }}
          placeholder="Age"
        />
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: "1.1rem", fontWeight: 600 }}>Language</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                className={settings.language === l.id ? "primary" : ""}
                style={{ fontSize: "1.05rem", padding: "12px 18px" }}
                onClick={() => update({ language: l.id })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <button className="primary" style={{ marginTop: "auto", fontSize: "1.2rem", padding: 16 }} onClick={confirmAge}>
          Continue
        </button>
      </div>
    );
  }

  const s = SLIDES[slide];
  return (
    <div className="tutorial-overlay">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem" }}>{s.title}</h1>
        <p style={{ fontSize: "1.25rem", lineHeight: 1.5 }}>{s.body}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
        {SLIDES.map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i === slide ? "var(--color-primary)" : "var(--color-border)" }} />
        ))}
      </div>
      <button
        className="primary"
        style={{ fontSize: "1.2rem", padding: 16 }}
        onClick={() => (slide < SLIDES.length - 1 ? setSlide((i) => i + 1) : finish())}
      >
        {slide < SLIDES.length - 1 ? "Next" : "Get started"}
      </button>
    </div>
  );
}
