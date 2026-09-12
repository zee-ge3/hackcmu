import React from "react";

// Dependency-free SVG primitives. Props in, SVG out — no app imports, so these
// stay reusable between the home dashboard, the profile page and feedback.

// Scores over time. The viewBox scales with the card; axis labels are HTML so
// they keep the page's font sizing instead of being scaled by the viewBox.
export function Sparkline({ points, max = 5, ariaLabel }) {
  const W = 600;
  const H = 120;
  const pad = 10;
  if (!points || points.length < 2) return null;
  const xs = points.map((p) => p.at);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const span = hi - lo || 1;
  const x = (p) => pad + ((p.at - lo) / span) * (W - pad * 2);
  const y = (p) => H - pad - (Math.max(0, p.score) / max) * (H - pad * 2);
  const line = points.map((p) => `${x(p).toFixed(1)},${y(p).toFixed(1)}`);
  const area = `M ${x(points[0]).toFixed(1)},${H - pad} L ${line.join(" L ")} L ${x(
    points[points.length - 1],
  ).toFixed(1)},${H - pad} Z`;
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel || "Score trend"}
    >
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        className="spark-grid"
        x1={pad}
        x2={W - pad}
        y1={H - pad - (0.5 * (H - pad * 2))}
        y2={H - pad - (0.5 * (H - pad * 2))}
      />
      <path className="spark-area" d={area} fill="url(#sparkfill)" />
      <polyline className="spark-line" points={line.join(" ")} />
      {points.map((p, i) => (
        <circle
          key={p.id || i}
          className="spark-dot"
          cx={x(p)}
          cy={y(p)}
          r={i === points.length - 1 ? 5 : 3.5}
        />
      ))}
    </svg>
  );
}

// Fixed-size circular score. Used for the headline average and per-mode tiles.
export function Ring({ value, max = 5, size = 64, thickness = 6, label }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={thickness}
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={thickness}
          strokeDasharray={`${(c * pct).toFixed(2)} ${c.toFixed(2)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-value">
        {value === null || value === undefined ? "–" : value.toFixed(1)}
      </span>
      {label && <span className="ring-label">{label}</span>}
    </div>
  );
}

// Horizontal bar, matching the existing .score-bar markup so profile styling
// and this stay in sync.
export function Meter({ value, max = 5 }) {
  const pct = Math.max(0, Math.min(1, (value || 0) / max)) * 100;
  return (
    <span className="score-bar" aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}
