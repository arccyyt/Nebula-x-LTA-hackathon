import { useEffect, useState } from "react";
import type { ItineraryLeg } from "../types";
import { useSettings } from "../state/settings";
import { recordWalk } from "../utils/walkingSpeed";

export default function WalkingModeSheet({ leg, onClose }: { leg: ItineraryLeg; onClose: () => void }) {
  const { settings } = useSettings();
  const steps = leg.steps ?? [];
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate(120);
    if (settings.soundOn && "speechSynthesis" in window && steps[index]) {
      const utter = new SpeechSynthesisUtterance(`${steps[index].instruction}, ${steps[index].distanceMeters} metres`);
      window.speechSynthesis.speak(utter);
    }
  }, [index]);

  const finish = () => {
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    if (leg.meters) recordWalk(settings.mobility, leg.meters, elapsedSeconds);
    onClose();
  };

  const step = steps[index];

  return (
    <div className="bottom-sheet" role="dialog" aria-label="Walking mode">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Walking mode &middot; {leg.fromLabel} &rarr; {leg.toLabel}</strong>
        <button onClick={finish}>End</button>
      </div>
      <p className="leg-sub" style={{ marginTop: 4 }}>
        You can lock your phone -- vibration cues each step change. True background push guidance needs a native app; this demo keeps the tab active (see README limitations).
      </p>
      {step ? (
        <div className="card" style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{step.instruction}</div>
          <div className="leg-sub" style={{ fontSize: "1.1rem" }}>{step.distanceMeters} m {step.effort !== "flat" ? `· ${step.effort.replace("-", " ")}` : ""}</div>
          <div className="leg-sub" style={{ marginTop: 6 }}>Step {index + 1} of {steps.length}</div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12, textAlign: "center" }}>Arrived.</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} style={{ flex: 1 }}>Back</button>
        {index < steps.length - 1 ? (
          <button className="primary" onClick={() => setIndex((i) => i + 1)} style={{ flex: 1 }}>Next step</button>
        ) : (
          <button className="primary" onClick={finish} style={{ flex: 1 }}>Arrived</button>
        )}
      </div>
    </div>
  );
}
