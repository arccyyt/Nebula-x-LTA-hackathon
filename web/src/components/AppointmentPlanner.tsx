import { useEffect, useState } from "react";
import { useSettings } from "../state/settings";
import { PERSONAS } from "../types";
import { planRoute } from "../api";
import { getLearnedSpeed, sampleCount } from "../utils/walkingSpeed";

interface Appointment {
  id: string;
  name: string;
  venuePostal: string;
  atISO: string;
  leaveByISO?: string;
  travelMin?: number;
}

const KEY = "scc.appointments.v1";

function load(): Appointment[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(items: Appointment[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export default function AppointmentPlanner() {
  const { settings } = useSettings();
  const preset = PERSONAS.find((p) => p.id === settings.persona) ?? PERSONAS[0];
  const [appointments, setAppointments] = useState<Appointment[]>(load);
  const [name, setName] = useState("");
  const [venuePostal, setVenuePostal] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => save(appointments), [appointments]);

  const addAppointment = async () => {
    if (!name || !venuePostal || !when) return;
    setBusy(true);
    try {
      const whenSGT = `${when}:00+08:00`; // <input type="datetime-local"> has no timezone; treat it as SGT wall-clock time
      const plan = await planRoute({ originPostal: preset.originPostal, destPostal: venuePostal, persona: settings.persona, mobility: settings.mobility, departAt: whenSGT });
      const leaveBy = new Date(new Date(whenSGT).getTime() - (plan.eta.typicalMin + 5) * 60000);
      const appt: Appointment = { id: `${Date.now()}`, name, venuePostal, atISO: whenSGT, leaveByISO: leaveBy.toISOString(), travelMin: plan.eta.typicalMin };
      setAppointments((list) => [...list, appt].sort((a, b) => a.atISO.localeCompare(b.atISO)));
      setName("");
      setVenuePostal("");
      setWhen("");
    } finally {
      setBusy(false);
    }
  };

  const walkSamples = sampleCount(settings.mobility);

  return (
    <div className="card">
      <h3>Upcoming appointments &middot; must-leave-by</h3>
      <p className="leg-sub">
        Learned walking pace: {getLearnedSpeed(settings.mobility)} m/min ({walkSamples} walk{walkSamples === 1 ? "" : "s"} logged via Walking mode).
      </p>
      <div className="grid-2">
        <div className="field-row">
          <label>Event name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="SGH appointment" />
        </div>
        <div className="field-row">
          <label>Venue postal code</label>
          <input type="text" inputMode="numeric" value={venuePostal} onChange={(e) => setVenuePostal(e.target.value)} placeholder="169608" />
        </div>
      </div>
      <div className="field-row" style={{ marginTop: 8 }}>
        <label>Date &amp; time</label>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <button className="primary" style={{ marginTop: 10, width: "100%" }} disabled={busy} onClick={addAppointment}>
        {busy ? "Calculating..." : "Add & calculate leave-by time"}
      </button>

      {appointments.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {appointments.map((a) => (
            <div key={a.id} className="leg-row">
              <span className="leg-rail" style={{ background: "var(--color-primary)" }} />
              <div className="leg-body">
                <div className="leg-title">{a.name}</div>
                <div className="leg-sub">
                  {new Date(a.atISO).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}
                  {a.leaveByISO && (
                    <> &middot; leave by <strong>{new Date(a.leaveByISO).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}</strong> ({a.travelMin} min journey)</>
                  )}
                </div>
              </div>
              <button onClick={() => setAppointments((list) => list.filter((x) => x.id !== a.id))} aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
