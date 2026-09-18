import { useEffect, useState } from "react";
import { useSettings } from "../state/settings";
import { getPointsBalance, getRewards, redeemReward } from "../api";

interface Reward { id: string; label: string; cost: number; partner: string }
interface Account { points: number; wrongReports: number; totalReports: number; bannedUntil: string | null }

export default function PointsWidget({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const [account, setAccount] = useState<Account | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);

  const refresh = async () => {
    const [acc, rew] = await Promise.all([getPointsBalance(settings.userId), getRewards()]);
    setAccount(acc);
    setRewards(rew);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redeem = async (rewardId: string) => {
    const res = await redeemReward(settings.userId, rewardId);
    if (res.ok) {
      setRedeemMsg(`Redeemed! Code: ${res.code}`);
      setAccount(res.account);
    } else {
      setRedeemMsg(res.reason);
    }
  };

  return (
    <div className="bottom-sheet" role="dialog" aria-label="TransitPoints">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>TransitPoints</h3>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="card" style={{ marginTop: 10, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700 }}>{account?.points ?? "..."}</div>
        <div className="leg-sub">points &middot; earned by walking to nudges and verifying facilities on-site</div>
        {account?.bannedUntil && <div className="badge demo" style={{ marginTop: 6 }}>Reporting paused until {new Date(account.bannedUntil).toLocaleDateString()}</div>}
      </div>
      <h3 style={{ marginTop: 16 }}>Redeem</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rewards.map((r) => (
          <div key={r.id} className="leg-row">
            <div className="leg-body">
              <div className="leg-title">{r.label}</div>
              <div className="leg-sub">{r.cost} points &middot; {r.partner}</div>
            </div>
            <button disabled={!account || account.points < r.cost} onClick={() => redeem(r.id)}>Redeem</button>
          </div>
        ))}
      </div>
      {redeemMsg && <div className="badge live" style={{ marginTop: 10 }}>{redeemMsg}</div>}
      <p className="leg-sub" style={{ marginTop: 12 }}>
        Rewards are funded by the crowding they prevent, not by ad revenue -- see write-up for the economics assumption.
      </p>
    </div>
  );
}
