import type { CachedTicket } from "../utils/offlineCache";

export default function OfflineTicket({ ticket }: { ticket: CachedTicket | null }) {
  if (!ticket) {
    return (
      <div className="card">
        <h3>You're offline</h3>
        <p className="leg-sub">No saved ticket yet. Plan a journey while you have signal and it will be cached automatically for underground use.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>Saved ticket (offline)</h3>
        <span className="leg-sub">saved {new Date(ticket.savedAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <pre style={{
        whiteSpace: "pre-wrap",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "0.9rem",
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
      }}>
        {ticket.textCard}
      </pre>
    </div>
  );
}
