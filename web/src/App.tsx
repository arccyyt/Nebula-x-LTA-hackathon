import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import JourneyForm from "./components/JourneyForm";
import MapView from "./components/MapView";
import Legend from "./components/Legend";
import AISummaryCard from "./components/AISummaryCard";
import ItineraryList from "./components/ItineraryList";
import CrowdNudgeCard from "./components/CrowdNudgeCard";
import LiftStatusCard from "./components/LiftStatusCard";
import OfflineTicket from "./components/OfflineTicket";
import AccessibilityControls from "./components/AccessibilityControls";
import OnboardingTutorial from "./components/OnboardingTutorial";
import PointsWidget from "./components/PointsWidget";
import VerifyQuestCard from "./components/VerifyQuestCard";
import AppointmentPlanner from "./components/AppointmentPlanner";
import WalkingModeSheet from "./components/WalkingModeSheet";
import { useSettings } from "./state/settings";
import { useOnline } from "./utils/useOnline";
import { planRoute, getStationsGeoJSON, getCoveredLinkways } from "./api";
import { loadTicket, saveTicket, type CachedTicket } from "./utils/offlineCache";
import { sgtIsoFromTimeString } from "./utils/sgtTime";
import type { ItineraryLeg, Mobility, PlanResult } from "./types";

export default function App() {
  const { settings } = useSettings();
  const online = useOnline();
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<CachedTicket | null>(() => loadTicket());
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [walkingLeg, setWalkingLeg] = useState<ItineraryLeg | null>(null);
  const [stationsGeoJSON, setStationsGeoJSON] = useState<GeoJSON.FeatureCollection | undefined>();
  const [coveredLinkways, setCoveredLinkways] = useState<GeoJSON.FeatureCollection | undefined>();
  const [departShiftMin, setDepartShiftMin] = useState(0);

  useEffect(() => {
    getStationsGeoJSON().then(setStationsGeoJSON).catch(() => undefined);
    getCoveredLinkways().then(setCoveredLinkways).catch(() => undefined);
  }, []);

  const handlePlan = async (input: { originPostal: string; destPostal: string; departTime: string; mobility: Mobility }) => {
    setLoading(true);
    setError(null);
    try {
      const departAt = sgtIsoFromTimeString(input.departTime, departShiftMin);
      const result = await planRoute({
        originPostal: input.originPostal,
        destPostal: input.destPostal,
        departAt,
        persona: settings.persona,
        mobility: input.mobility,
      });
      setPlan(result);
      setTicket(saveTicket(result));
      setDepartShiftMin(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const showOnboarding = !settings.onboardingDone;

  return (
    <div className="app-shell">
      {showOnboarding && <OnboardingTutorial onDone={() => undefined} />}
      <TopBar onOpenAccessibility={() => setShowAccessibility(true)} onOpenPoints={() => setShowPoints(true)} />

      {!online && <div className="offline-banner">You're offline -- showing your saved ticket. Live replanning needs signal.</div>}

      <div className="main-scroll">
        {!online ? (
          <OfflineTicket ticket={ticket} />
        ) : (
          <>
            <JourneyForm onPlan={handlePlan} loading={loading} />
            {error && <div className="card" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>{error}</div>}

            {plan && (
              <>
                <MapView
                  legs={plan.legs}
                  altLegs={plan.alternative?.legs}
                  originPos={plan.origin.pos}
                  destPos={plan.destination.pos}
                  stationsGeoJSON={stationsGeoJSON}
                  coveredLinkways={coveredLinkways}
                />
                <Legend />
                <AISummaryCard plan={plan} />
                {plan.disruption && (
                  <div className="card" style={{ borderColor: "var(--color-danger)" }}>
                    <span className="status-pill disrupted">Disrupted</span>
                    <p style={{ marginBottom: 0 }}>{plan.disruption.message}</p>
                  </div>
                )}
                {plan.crowdNudge && (
                  <CrowdNudgeCard nudge={plan.crowdNudge} onShiftDeparture={(min) => setDepartShiftMin((v) => v + min)} />
                )}
                {plan.liftReroute && <LiftStatusCard liftReroute={plan.liftReroute} />}
                <ItineraryList plan={plan} onStartWalking={setWalkingLeg} />
                {plan.liftReroute && (
                  <VerifyQuestCard
                    facility={`${plan.liftReroute.originalStation} lift (${plan.liftReroute.exit})`}
                    targetPos={plan.destination.pos}
                    claimLabels={[
                      { value: "clear", label: "Lift is working now" },
                      { value: "broken", label: "Still broken" },
                    ]}
                  />
                )}
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                  Data: {Object.entries(plan.dataSources).map(([k, v]) => `${k}:${v === "live" ? "live" : "demo"}`).join(" · ")}
                </div>
              </>
            )}

            <AppointmentPlanner />
          </>
        )}
      </div>

      {showAccessibility && <AccessibilityControls onClose={() => setShowAccessibility(false)} />}
      {showPoints && <PointsWidget onClose={() => setShowPoints(false)} />}
      {walkingLeg && <WalkingModeSheet leg={walkingLeg} onClose={() => setWalkingLeg(null)} />}
    </div>
  );
}
