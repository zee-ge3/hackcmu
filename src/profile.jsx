import React, { useEffect, useState } from "react";
import {
  Check,
  FileText,
  History,
  KeyRound,
  LogOut,
  Trash2,
} from "lucide-react";
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
export function Profile({ navigate }) {
  const { user, signOut, setUser } = useAccount();
  const [resumes, setResumes] = useState(null),
    [history, setHistory] = useState(null),
    [key, setKey] = useState(""),
    [keyBusy, setKeyBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api("/api/resumes", undefined, "GET"),
      api("/api/history", undefined, "GET"),
    ])
      .then(([r, h]) => {
        setResumes(r.resumes);
        setHistory(h.interviews);
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
      setNotice("Key verified with OpenAI and saved.");
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
    <main className="setup profile-page">
      <div className="page-heading">
        <span className="eyebrow muted">YOUR PROFILE</span>
        <h1>Everything you bring to the room.</h1>
        <p>
          Résumés, your OpenAI key, and past feedback stay with your account.
        </p>
      </div>
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
                <span>Delete your account and all saved data?</span>
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
                  Yes, delete
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
        <section className="card profile-card">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">BRING YOUR OWN KEY</span>
              <h2>OpenAI API key</h2>
            </div>
            <KeyRound size={20} />
          </div>
          <p className="upload-note">
            Interviews run on your own OpenAI account. The key is checked
            against OpenAI, stored encrypted, and never shown again.
          </p>
          <div className="key-status">
            {user.openaiKeyHint ? (
              <>
                <Check size={14} /> Key on file · {user.openaiKeyHint}
              </>
            ) : (
              "No key yet"
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
              {keyBusy
                ? "Checking…"
                : user.openaiKeyHint
                  ? "Replace key"
                  : "Save key"}
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
          <div className="section-title">
            <div>
              <span className="eyebrow muted">SAVED CONTEXT</span>
              <h2>Résumés</h2>
            </div>
            <FileText size={20} />
          </div>
          <p className="upload-note">
            Uploaded on the behavioral setup page. Edits you make before
            entering a room are saved here too.
          </p>
          <div className="list-rows">
            {resumes?.map((r) => (
              <div className="list-row" key={r.id}>
                <div>
                  <strong>{r.filename}</strong>
                  <small>
                    {r.profile.name || "Unnamed"} · updated {when(r.updatedAt)}
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
            {resumes && !resumes.length && (
              <p className="muted">No résumés saved yet.</p>
            )}
          </div>
        </section>
        <section className="card profile-card">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">PAST INTERVIEWS</span>
              <h2>Feedback history</h2>
            </div>
            <History size={20} />
          </div>
          <div className="list-rows">
            {history?.map((h) => {
              const score = average(h.feedback);
              return (
                <div className="list-row" key={h.id}>
                  <div>
                    <span className="mode-tag">
                      {h.mode === "behavioral" ? "BEHAVIORAL" : "CODING"}
                      {h.language ? ` · ${h.language.toUpperCase()}` : ""}
                    </span>
                    <strong>{h.title}</strong>
                    <small>{when(h.finishedAt)}</small>
                    <p className="feedback-summary-line">
                      {h.feedback.summary}
                    </p>
                  </div>
                  {score && (
                    <span className="score" title="Average rubric score">
                      {score} / 5
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
            {history && !history.length && (
              <p className="muted">
                Finish an interview and its feedback will be kept here.
              </p>
            )}
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
