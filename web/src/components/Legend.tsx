const ITEMS: Array<{ color: string; label: string }> = [
  { color: "#009645", label: "On time" },
  { color: "#E11D2E", label: "Disrupted" },
  { color: "#0EA5A5", label: "Bus bridge" },
  { color: "#F59E0B", label: "Exposed walk (rain)" },
  { color: "#2563EB", label: "Sheltered walk" },
];

export default function Legend() {
  return (
    <div className="legend" aria-label="Map colour legend">
      {ITEMS.map((it) => (
        <span className="legend-item" key={it.label}>
          <span className="legend-swatch" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
