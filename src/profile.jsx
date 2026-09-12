import React, { useEffect, useState } from "react";
import { Check, LogOut, Trash2 } from "lucide-react";
import { api } from "./api.mjs";
import { useAccount } from "./account.jsx";
const when = (ms) =>
  new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
const average = (feedback) => {
  const scores = Object.values(feedback.criteria)
    .map((c) => c.score)
    .filter((s) => s !== null);
  return scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;
};
const modeNames = {
  coding: "Coding",
  behavioral: "Behavioral",
  probability: "Probability",
  design: "System design",
};
const Bar = ({ value }) => (
  <span className="score-bar" aria-hidden="true">
    <i style={{ width: `${((value || 0) / 5) * 100}%` }} />
  </span>
);
// Cross-session view: weakest criteria and topics, plus a recent-score trend.
function Insights({ insights }) {
  return (
    <section className="card profile-card insights-card">
      <h2>
        Insights{" "}
        <small>
          {insights.sessions} session{insights.sessions === 1 ? "" : "s"}
        </small>
      </h2>
      <div className="insight-columns">
        <div>
          <h4>Weakest criteria</h4>
          {insights.weakestCriteria.map((c) => (
            <div className="insight-row" key={c.mode + c.id}>
              <span className="insight-label">
                {c.label}
                <small>
                  {modeNames[c.mode]} · {c.n}
                </small>
              </span>
              <Bar value={c.avg} />
              <b>{c.avg.toFixed(1)}</b>
            </div>
          ))}
          {!insights.weakestCriteria.length && (
            <p className="muted">No graded sessions yet.</p>
          )}
        </div>
        <div>
          <h4>Weakest topics</h4>
          {insights.weakest.map((t) => (
            <div className="insight-row" key={t.topic}>
              <span className="insight-label">
                {t.topic}
                <small>
                  {t.modes.map((m) => modeNames[m]).join(", ")} · {t.n}
                </small>
              </span>
              <Bar value={t.avg} />
              <b>{t.avg.toFixed(1)}</b>
            </div>
          ))}
          {!insights.weakest.length && (
            <p className="muted">No graded sessions yet.</p>
          )}
        </div>
      </div>
      {insights.trend.length > 1 && (
        <div className="trend">
          <h4>Recent scores</h4>
          <div className="trend-bars">
            {insights.trend.map((t) => (
              <span
                key={t.id}
                title={`${modeNames[t.mode]} · ${t.title} · ${t.score.toFixed(1)}`}
              >
                <i
                  style={{ height: `${(t.score / 5) * 100}%` }}
                  className={t.mode}
                />
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mode-averages">
        {Object.entries(insights.modes).map(([mode, m]) => (
          <span key={mode}>
            {modeNames[mode]} <b>{m.avg === null ? "—" : m.avg.toFixed(1)}</b>{" "}
            <small>/ 5 · {m.count}</small>
          </span>
        ))}
      </div>
    </section>
  );
}
export function Profile({ navigate }) {
  const { user, signOut, setUser } = useAccount();
  const [resumes, setResumes] = useState(null),
    [history, setHistory] = useState(null),
    [insights, setInsights] = useState(null),
    [key, setKey] = useState(""),
    [keyBusy, setKeyBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api("/api/resumes", undefined, "GET"),
      api("/api/history", undefined, "GET"),
      api("/api/insights", undefined, "GET"),
    ])
      .then(([r, h, i]) => {
        setResumes(r.resumes);
        setHistory(h.interviews);
        setInsights(i);
      })
      .catch((e) => setError(e.message));
  }, []);
  const run = async (task) => {
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(e.message);
    }
  };
  async function saveKey(e) {
    e.preventDefault();
    setKeyBusy(true);
    await run(async () => {
      const d = await api("/api/me/openai-key", { key }, "PUT");
      setUser(d.user);
      setKey("");
      setNotice("Key verified and saved.");
    });
    setKeyBusy(false);
  }
  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <main className="setup profile-page page">
      <header className="page-head">
        <h1>Profile</h1>
      </header>
      <div className="profile-grid">
        <section className="card profile-card account-card">
          {user.picture ? (
            <img
              className="avatar big"
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="avatar big">{initials}</span>
          )}
          <div>
            <h2>{user.name || user.email}</h2>
            <p className="muted">{user.email}</p>
          </div>
          <div className="row-actions">
            <button
              className="quiet"
              onClick={() => run(() => signOut().then(() => navigate("/")))}
            >
              <LogOut size={14} />
              Sign out
            </button>
            {confirmDelete ? (
              <>
                <span>Delete account and all data?</span>
                <button
                  className="danger"
                  onClick={() =>
                    run(async () => {
                      await api("/api/me", undefined, "DELETE");
                      setUser(null);
                      navigate("/");
                    })
                  }
                >
                  Delete
                </button>
                <button
                  className="quiet"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="quiet danger-text"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} />
                Delete account
              </button>
            )}
          </div>
        </section>
        {insights && insights.sessions > 0 && <Insights insights={insights} />}
        <section className="card profile-card">
          <h2>OpenAI API key</h2>
          <div className="key-status">
            {user.openaiKeyHint ? (
              <>
                <Check size={14} /> {user.openaiKeyHint}
                {user.openaiKeyUpdatedAt && (
                  <small> · added {when(user.openaiKeyUpdatedAt)}</small>
                )}
              </>
            ) : (
              "No key"
            )}
          </div>
          <form className="key-form" onSubmit={saveKey}>
            <input
              type="password"
              autoComplete="off"
              aria-label="OpenAI API key"
              placeholder="sk-…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button className="primary" disabled={keyBusy || !key.trim()}>
              {keyBusy ? "Checking…" : user.openaiKeyHint ? "Replace" : "Save"}
            </button>
          </form>
          {user.openaiKeyHint && (
            <button
              className="quiet"
              onClick={() =>
                run(async () => {
                  const d = await api(
                    "/api/me/openai-key",
                    undefined,
                    "DELETE",
                  );
                  setUser(d.user);
                })
              }
            >
              Remove key
            </button>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
        </section>
        <section className="card profile-card">
          <h2>Résumés</h2>
          <div className="list-rows">
            {resumes?.map((r) => (
              <div className="list-row" key={r.id}>
                <div>
                  <strong>{r.filename}</strong>
                  <small>
                    {r.profile.name || "Unnamed"} · {when(r.updatedAt)}
                  </small>
                </div>
                <button
                  aria-label={`Delete ${r.filename}`}
                  onClick={() =>
                    run(async () => {
                      await api(`/api/resumes/${r.id}`, undefined, "DELETE");
                      setResumes((list) => list.filter((x) => x.id !== r.id));
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {resumes && !resumes.length && <p className="muted">None.</p>}
          </div>
        </section>
        <section className="card profile-card">
          <h2>History</h2>
          <div className="list-rows">
            {history?.map((h) => {
              const score = average(h.feedback);
              return (
                <div className="list-row" key={h.id}>
                  <div>
                    <span className="mode-tag">
                      {modeNames[h.mode]}
                      {h.language ? ` · ${h.language}` : ""}
                    </span>
                    <strong>{h.title}</strong>
                    <small>{when(h.finishedAt)}</small>
                    <p className="feedback-summary-line">
                      {h.feedback.summary}
                    </p>
                  </div>
                  {score && (
                    <span className="score" title="Average rubric score">
                      {score}
                    </span>
                  )}
                  <button
                    aria-label="Delete interview feedback"
                    onClick={() =>
                      run(async () => {
                        await api(`/api/history/${h.id}`, undefined, "DELETE");
                        setHistory((list) => list.filter((x) => x.id !== h.id));
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {history && !history.length && <p className="muted">None.</p>}
          </div>
        </section>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </main>
  );
}
