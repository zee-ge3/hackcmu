import React from "react";
import {
  Code2,
  Dices,
  Network,
  Mic,
  ArrowRight,
  Mic2,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Sparkline, Ring, Meter } from "./charts.jsx";

export const modeNames = {
  coding: "Coding",
  behavioral: "Behavioral",
  probability: "Probability",
  design: "System design",
};

const n = (v) => (typeof v === "number" ? v.toLocaleString() : "—");

const shortDate = (ms) =>
  new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const average = (feedback) => {
  const scores = Object.values(feedback?.criteria || {})
    .map((c) => c.score)
    .filter((s) => typeof s === "number");
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
};

// Consecutive days with a finished session, counting back from today (or
// yesterday, so an evening-then-morning gap doesn't read as a broken streak).
export function streakDays(history) {
  if (!history?.length) return 0;
  const days = new Set(history.map((h) => new Date(h.finishedAt).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(d.toDateString())) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

const minutes = (h) => {
  const ms = h.finishedAt - h.createdAt;
  if (!(ms > 0)) return null;
  return Math.max(1, Math.round(ms / 60000));
};

export const modeCards = (stats) => [
  {
    url: "/coding",
    title: "Coding",
    icon: Code2,
    line: "LeetCode problems in a shared editor, with a debugger you can step through.",
    facts: [
      `${n(stats.tested)} with hidden tests`,
      `${n(stats.problems)} statements`,
      "JavaScript · Python",
    ],
  },
  {
    url: "/probability",
    title: "Probability",
    icon: Dices,
    line: "Quant brainteasers checked against reference answers, with graded hints.",
    facts: [
      `${n(stats.questions)} questions`,
      stats.firms?.length ? `Asked at ${stats.firms.join(" · ")}` : "AMC · AIME · AoPS",
      "Levels 1–10",
    ],
  },
  {
    url: "/design",
    title: "System design",
    icon: Network,
    line: "A brief, a clock, and constraints that land while you are still drawing.",
    facts: [`${n(stats.designs)} systems or your own`, "20–45 minutes", "3 constraints"],
  },
  {
    url: "/behavioral",
    title: "Behavioral",
    icon: Mic,
    line: "Questions grounded in the résumé you upload, scored on story structure.",
    facts: ["PDF · DOCX · TXT", "Story-structure rubric"],
  },
];

// A still frame of the room, so the landing page shows the product instead of
// describing it. Decorative only.
export function RoomPreview() {
  return (
    <div className="room-preview" aria-hidden="true">
      <div className="rp-bar">
        <span className="rp-dot" />
        <span className="rp-dot" />
        <span className="rp-dot" />
        <small>Two Sum · 12:04</small>
      </div>
      <div className="rp-body">
        <div className="rp-agent">
          <span className="rp-wave">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <p>“What’s the time complexity of the version you just wrote?”</p>
        </div>
        <pre className="rp-code">
          <code>
            <span className="rp-kw">const</span> seen = <span className="rp-kw">new</span>{" "}
            <span className="rp-fn">Map</span>();{"\n"}
            <span className="rp-kw">for</span> (<span className="rp-kw">let</span> i = 0; i &lt;
            nums.length; i++) {"{"}
            {"\n"} <span className="rp-cm">// one pass, O(n)</span>
            {"\n"}
            {"}"}
          </code>
        </pre>
        <div className="rp-result">
          <span className="rp-pass">Accepted</span>
          <small>677 hidden cases</small>
        </div>
      </div>
    </div>
  );
}

export function Hero({ stats, children }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>
          Talk through it.
          <br />
          Get scored on it.
        </h1>
        <p className="hero-sub">
          A voice interviewer that hears your reasoning, reads your code as you write it, and
          grades you on the same rubric a real panel would.
        </p>
        <div className="hero-cta">{children}</div>
        <StatStrip stats={stats} />
      </div>
      <RoomPreview />
    </section>
  );
}

export function StatStrip({ stats }) {
  const items = [
    [n(stats.problems), "coding problems"],
    ["677", "hidden test cases"],
    [n(stats.questions), "quant questions"],
    [n(stats.designs), "systems to design"],
  ];
  return (
    <ul className="stat-strip">
      {items.map(([v, l]) => (
        <li key={l}>
          <b>{v}</b>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

export function ModeGrid({ stats, go }) {
  return (
    <section className="modes">
      {modeCards(stats).map((m) => (
        <a key={m.url} className="mode" href={m.url} onClick={go(m.url)}>
          <span className="mode-icon" aria-hidden="true">
            <m.icon size={18} />
          </span>
          <div className="mode-head">
            <h2>{m.title}</h2>
          </div>
          <p>{m.line}</p>
          <ul className="mode-facts">
            {m.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <span className="mode-go" aria-hidden="true">
            Start <ArrowRight size={14} />
          </span>
        </a>
      ))}
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    [Mic2, "Pick a room and talk", "Your mic opens on entry. Think out loud — Alex listens and interrupts like an interviewer would."],
    [ListChecks, "Work the problem", "Write code, draw on the whiteboard, or reason a number out. Ask for a hint, a test run, or a walkthrough."],
    [Sparkles, "Get a scored rubric", "Five criteria, evidence quoted from your own session, and one concrete thing to fix next time."],
  ];
  return (
    <section className="how card">
      <h2>How a session runs</h2>
      <ol className="how-steps">
        {steps.map(([Icon, title, body], i) => (
          <li key={title}>
            <span className="how-num" aria-hidden="true">
              <Icon size={16} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FirmStrip({ firms }) {
  if (!firms?.length) return null;
  return (
    <p className="firm-strip">
      <span>Probability questions asked at</span>
      {firms.map((f) => (
        <b key={f}>{f}</b>
      ))}
    </p>
  );
}

export function DashboardBand({ insights, history, name }) {
  const avg =
    insights?.trend?.length
      ? insights.trend.reduce((a, b) => a + b.score, 0) / insights.trend.length
      : null;
  const streak = streakDays(history);
  return (
    <section className="dash-band">
      <div className="dash-greet">
        <h1>{name ? `Welcome back, ${name.split(/\s+/)[0]}.` : "Welcome back."}</h1>
        <p className="hero-sub">Pick up where you left off, or try a room you have been avoiding.</p>
      </div>
      <div className="dash-tiles">
        <div className="dash-tile">
          <Ring value={avg} size={72} />
          <span className="dash-tile-label">Average score</span>
        </div>
        <div className="dash-tile">
          <b className="dash-num">{insights?.sessions ?? 0}</b>
          <span className="dash-tile-label">Sessions</span>
        </div>
        <div className="dash-tile">
          <b className="dash-num">{streak}</b>
          <span className="dash-tile-label">Day streak</span>
        </div>
      </div>
    </section>
  );
}

export function TrendCard({ trend }) {
  if (!trend?.length) return null;
  if (trend.length < 2)
    return (
      <section className="card trend-card">
        <h2>Score trend</h2>
        <p className="muted">One session so far. Finish another to see a trend line.</p>
      </section>
    );
  return (
    <section className="card trend-card">
      <h2>
        Score trend <small>last {trend.length} sessions</small>
      </h2>
      <Sparkline points={trend} ariaLabel="Average score per session over time" />
      <div className="trend-axis">
        <span>{shortDate(trend[0].at)}</span>
        <span>{shortDate(trend[trend.length - 1].at)}</span>
      </div>
    </section>
  );
}

export function StrengthsCard({ insights }) {
  const strong = insights?.strongest?.slice(0, 4) || [];
  const weak = insights?.weakest?.slice(0, 4) || [];
  if (!strong.length && !weak.length) return null;
  return (
    <section className="card strengths-card">
      <h2>Where you stand</h2>
      <div className="strengths-cols">
        <div>
          <h3 className="col-head good">Strongest</h3>
          {strong.length ? (
            strong.map((t) => (
              <div className="insight-row" key={"s" + t.topic}>
                <span className="insight-label">{t.topic}</span>
                <Meter value={t.avg} />
                <b>{t.avg.toFixed(1)}</b>
              </div>
            ))
          ) : (
            <p className="muted">Not enough sessions yet.</p>
          )}
        </div>
        <div>
          <h3 className="col-head bad">Needs work</h3>
          {weak.length ? (
            weak.map((t) => (
              <div className="insight-row" key={"w" + t.topic}>
                <span className="insight-label">{t.topic}</span>
                <Meter value={t.avg} />
                <b>{t.avg.toFixed(1)}</b>
              </div>
            ))
          ) : (
            <p className="muted">Not enough sessions yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function ModeAverages({ insights }) {
  const entries = Object.entries(insights?.modes || {}).filter(([, m]) => m.count > 0);
  if (!entries.length) return null;
  return (
    <section className="card room-averages">
      <h2>By room</h2>
      <div className="mode-rings">
        {entries.map(([mode, m]) => (
          <div className="mode-ring" key={mode}>
            <Ring value={m.avg} size={56} thickness={5} />
            <strong>{modeNames[mode] || mode}</strong>
            <small>
              {m.count} session{m.count === 1 ? "" : "s"}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentSessions({ history, go, onRetry, error }) {
  return (
    <section className="card recent-card">
      <h2>Recent sessions</h2>
      {error ? (
        <p className="muted">
          Couldn’t load history.{" "}
          <button className="quiet" onClick={onRetry}>
            Retry
          </button>
        </p>
      ) : (
        <ul className="recent">
          {history.map((h) => {
            const score = average(h.feedback);
            const mins = minutes(h);
            return (
              <li key={h.id}>
                <a href="/profile" onClick={go("/profile")}>
                  <span className="recent-mode">{modeNames[h.mode]}</span>
                  <span className="recent-title">{h.title}</span>
                  <span className="recent-when">
                    {shortDate(h.finishedAt)}
                    {mins ? ` · ${mins}m` : ""}
                  </span>
                  {score !== null && <span className="score">{score.toFixed(1)}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
