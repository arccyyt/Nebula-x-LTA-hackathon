import type { PlanResult } from "../types";
import { awardNudgeFollowed } from "../api";
import { useSettings } from "../state/settings";
import { useState } from "react";

export default function CrowdNudgeCard({ nudge, onShiftDeparture }: { nudge: NonNullable<PlanResult["crowdNudge"]>; onShiftDeparture: (minutes: number) => void }) {
  const { settings } = useSettings();
  const [followed, setFollowed] = useState(false);
  const time = new Date(nudge.time).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" });

  const follow = async () => {
    onShiftDeparture(nudge.shiftMinutes);
    setFollowed(true);
    try {
      await awardNudgeFollowed(settings.userId);
    } catch {
      /* points award is a bonus, not required for the nudge itself */
    }
  };

  return (
    <div className="nudge-card">
      <strong>Platform forecast: High at {nudge.station} around {time}.</strong>
      <div style={{ margin: "6px 0" }}>
        Shift your departure by {nudge.shiftMinutes} min to drop crowding to {nudge.newLevel}.
      </div>
      {!followed ? (
        <button className="primary" onClick={follow}>
          Shift by {nudge.shiftMinutes} min &middot; earn 30 TransitPoints
        </button>
      ) : (
        <span className="badge live">+30 points added</span>
      )}
    </div>
  );
}
