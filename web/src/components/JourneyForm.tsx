import { useEffect, useState } from "react";
import { useSettings } from "../state/settings";
import { PERSONAS } from "../types";
import type { Mobility } from "../types";

interface Props {
  onPlan: (input: { originPostal: string; destPostal: string; departTime: string; mobility: Mobility }) => void;
  loading: boolean;
}

export default function JourneyForm({ onPlan, loading }: Props) {
  const { settings, update } = useSettings();
  const preset = PERSONAS.find((p) => p.id === settings.persona) ?? PERSONAS[0];
  const [originPostal, setOriginPostal] = useState(preset.originPostal);
  const [destPostal, setDestPostal] = useState(preset.destPostal);
  const [departTime, setDepartTime] = useState(preset.defaultDepartTime);

  useEffect(() => {
    setOriginPostal(preset.originPostal);
    setDestPostal(preset.destPostal);
    setDepartTime(preset.defaultDepartTime);
  }, [preset.id]);

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        onPlan({ originPostal, destPostal, departTime, mobility: settings.mobility });
      }}
    >
      <h3 style={{ marginTop: 0 }}>Plan your journey</h3>
      <div className="grid-2">
        <div className="field-row">
          <label htmlFor="origin">From (postal code)</label>
          <input id="origin" type="text" inputMode="numeric" value={originPostal} onChange={(e) => setOriginPostal(e.target.value)} required />
        </div>
        <div className="field-row">
          <label htmlFor="dest">To (postal code)</label>
          <input id="dest" type="text" inputMode="numeric" value={destPostal} onChange={(e) => setDestPostal(e.target.value)} required />
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 8 }}>
        <div className="field-row">
          <label htmlFor="departTime">Depart at</label>
          <input id="departTime" type="time" value={departTime} onChange={(e) => setDepartTime(e.target.value)} />
        </div>
        <div className="field-row">
          <label htmlFor="mobility">Mobility mode</label>
          <select id="mobility" value={settings.mobility} onChange={(e) => update({ mobility: e.target.value as Mobility })}>
            <option value="standard">Standard</option>
            <option value="wheelchair">Wheelchair</option>
            <option value="stroller">Stroller</option>
          </select>
        </div>
      </div>
      <button className="primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 12 }}>
        {loading ? "Planning..." : "Plan journey"}
      </button>
    </form>
  );
}
