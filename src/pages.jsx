import React, { useState, useRef, useEffect } from "react";
import {
  Braces,
  ArrowRight,
  Upload,
  FileText,
  Check,
  Trash2,
  KeyRound,
  Mic,
} from "lucide-react";
import { behavioralPresets } from "./behavioral.mjs";
import { api } from "./api.mjs";
import { useAccount, GoogleSignIn } from "./account.jsx";
import { PresetPicker } from "./PresetPicker.jsx";
import { ErrorBanner, PageHead } from "./ui.jsx";
import {
  Hero,
  ModeGrid,
  HowItWorks,
  FirmStrip,
  DashboardBand,
  TrendCard,
  StrengthsCard,
  ModeAverages,
  RecentSessions,
} from "./dashboard.jsx";
export function KeyNotice({ navigate }) {
  return (
    <p className="key-notice">
      <KeyRound size={13} />
      <a
        href="/profile"
        onClick={(e) => {
          e.preventDefault();
          navigate("/profile");
        }}
      >
        Add an OpenAI API key
      </a>{" "}
      to start.
    </p>
  );
}
export function SiteHeader({ path, navigate }) {
  const { user, loading } = useAccount();
  const initials = user
    ? (user.name || user.email)
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";
  return (
    <header className="topbar">
      <a
        className="brand"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          navigate("/");
        }}
      >
        <span className="brand-mark">
          <Braces size={20} />
        </span>
        pairwise
      </a>
      <nav>
        {[
          ["/coding", "Coding"],
          ["/probability", "Probability"],
          ["/design", "System design"],
          ["/behavioral", "Behavioral"],
        ].map(([url, label]) => (
          <a
            key={url}
            className={path === url ? "nav-active" : ""}
            href={url}
            onClick={(e) => {
              e.preventDefault();
              navigate(url);
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      {loading ? (
        <div className="avatar" />
      ) : user ? (
        <a
          className={
            "account-link " + (path === "/profile" ? "nav-active" : "")
          }
          href="/profile"
          onClick={(e) => {
            e.preventDefault();
            navigate("/profile");
          }}
        >
          {user.picture ? (
            <img
              className="avatar"
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="avatar">{initials}</span>
          )}
          <span>{user.name?.split(" ")[0] || user.email}</span>
        </a>
      ) : (
        <GoogleSignIn size="medium" />
      )}
    </header>
  );
}
export function Home({ navigate }) {
  const { user, loading } = useAccount();
  const [recent, setRecent] = useState(null);
  const [insights, setInsights] = useState(null);
  const [stats, setStats] = useState({});
  useEffect(() => {
    api("/api/stats", undefined, "GET")
      .then(setStats)
      .catch(() => {});
  }, []);
  const load = () => {
    setRecent(null);
    Promise.all([
      api("/api/history", undefined, "GET"),
      api("/api/insights", undefined, "GET"),
    ])
      .then(([h, i]) => {
        setRecent(h.interviews.slice(0, 8));
        setInsights(i);
      })
      .catch((e) => setRecent({ error: e.message }));
  };
  useEffect(() => {
    if (user) load();
  }, [user]);
  const go = (url) => (e) => {
    e.preventDefault();
    navigate(url);
  };
  const history = Array.isArray(recent) ? recent : null;
  const hasSessions = history?.length > 0;
  return (
    <main className="home page">
      {!loading && !user && (
        <Hero stats={stats}>
          <GoogleSignIn />
        </Hero>
      )}
      {user && hasSessions && (
        <DashboardBand insights={insights} history={history} name={user.name} />
      )}
      {user && !hasSessions && recent !== null && !recent.error && (
        <Hero stats={stats}>
          <a className="primary start" href="/coding" onClick={go("/coding")}>
            Start your first interview
          </a>
        </Hero>
      )}
      {user && recent === null && <div className="skeleton dash-skeleton" />}

      <ModeGrid stats={stats} go={go} />

      {user && hasSessions && (
        <>
          <div className="home-lower">
            <TrendCard trend={insights?.trend} />
            <StrengthsCard insights={insights} />
          </div>
          <div className="home-lower">
            <RecentSessions
              history={history}
              go={go}
              onRetry={load}
              error={recent?.error}
            />
            <ModeAverages insights={insights} />
          </div>
        </>
      )}

      {user && recent?.error && (
        <div className="home-lower">
          <RecentSessions history={[]} go={go} onRetry={load} error={recent.error} />
        </div>
      )}

      {(!user || (user && !hasSessions)) && (
        <>
          <HowItWorks />
          <FirmStrip firms={stats.firms} />
        </>
      )}
    </main>
  );
}
export function BehavioralSetup({ onStart, navigate }) {
  const { user } = useAccount();
  const hasKey = !!user?.openaiKeyHint;
  const [resumes, setResumes] = useState(null),
    [selected, setSelected] = useState(null),
    [resumeText, setResumeText] = useState(""),
    [role, setRole] = useState("Software engineer"),
    [focus, setFocus] = useState(
      "Ownership, collaboration, and learning from setbacks",
    ),
    [preset, setPreset] = useState(behavioralPresets[0].id),
    [prompt, setPrompt] = useState(behavioralPresets[0].prompt),
    [uploading, setUploading] = useState(false),
    [starting, setStarting] = useState(false),
    [resumeError, setResumeError] = useState(""),
    [startError, setStartError] = useState("");
  const uploadVersion = useRef(0);
  const resume = resumes?.find((r) => r.id === selected) || null;
  function choose(record) {
    setSelected(record?.id || null);
    setResumeText(record?.reviewedText ?? record?.profile?.fullText ?? "");
  }
  useEffect(() => {
    api("/api/resumes", undefined, "GET")
      .then((d) => {
        setResumes(d.resumes);
        choose(d.resumes[0]);
      })
      .catch((e) => setResumeError(e.message));
  }, []);
  async function upload(file) {
    if (!file) return;
    const version = ++uploadVersion.current;
    setResumeError("");
    if (
      !/\.(pdf|docx|txt)$/i.test(file.name) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    ) {
      setResumeError("PDF, DOCX, or TXT under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(file);
      });
      const result = await api("/api/resumes", { filename: file.name, data });
      if (version === uploadVersion.current) {
        setResumes((list) => [result, ...(list || [])]);
        choose(result);
      }
    } catch (e) {
      if (version === uploadVersion.current) setResumeError(e.message);
    } finally {
      if (version === uploadVersion.current) setUploading(false);
    }
  }
  async function remove(record) {
    setResumeError("");
    try {
      await api(`/api/resumes/${record.id}`, undefined, "DELETE");
      const rest = resumes.filter((r) => r.id !== record.id);
      setResumes(rest);
      if (selected === record.id) choose(rest[0]);
    } catch (e) {
      setResumeError(e.message);
    }
  }
  async function start() {
    setStarting(true);
    setStartError("");
    try {
      onStart(
        await api("/api/interviews", {
          mode: "behavioral",
          resumeId: selected,
          resumeText,
          targetRole: role,
          focus,
          interviewerPrompt: prompt,
          interviewerStyle: preset,
        }),
      );
    } catch (e) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  }
  return (
    <main className="setup page">
      <PageHead
        icon={Mic}
        title="Behavioral"
        subtitle="Upload a résumé and Alex will ask about the work you actually did."
      />

      <div className="behavioral-grid">
        <section className="card config">
          <h2>Résumé</h2>
          {resumes?.length > 0 && (
            <div className="resume-picker" role="radiogroup">
              {resumes.map((r) => (
                <div
                  role="radio"
                  tabIndex={0}
                  aria-checked={r.id === selected}
                  key={r.id}
                  className={
                    "resume-option " + (r.id === selected ? "selected" : "")
                  }
                  onClick={() => choose(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choose(r);
                    }
                  }}
                >
                  {r.id === selected ? (
                    <Check size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <div>
                    <strong>{r.filename}</strong>
                    <small>
                      {r.profile.name || "Unnamed"} ·{" "}
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${r.filename}`}
                    className="resume-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(r);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className={"upload-zone " + (uploading ? "uploading" : "")}>
            <Upload size={18} />
            <strong>
              {uploading
                ? "Parsing…"
                : resumes?.length
                  ? "Upload another"
                  : "Upload résumé"}
            </strong>
            <span>PDF, DOCX, TXT · 5 MB</span>
            <input
              type="file"
              aria-label="Upload résumé"
              accept=".pdf,.docx,.txt"
              disabled={uploading || !hasKey}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <ErrorBanner error={resumeError} />
          {resume && (
            <div className="resume-review">
              <h3>{resume.profile.name || resume.filename}</h3>
              <p>{resume.profile.summary}</p>
              <div className="chips">
                {resume.profile.skills.slice(0, 10).map((skill, i) => (
                  <span className="chip" key={i}>
                    {skill}
                  </span>
                ))}
              </div>
              <label className="field-label" htmlFor="resume-text">
                Extracted text
              </label>
              <textarea
                id="resume-text"
                value={resumeText}
                maxLength={18000}
                rows={12}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>
          )}
        </section>
        <aside>
          <section className="card config behavioral-options">
            <h2>Session</h2>
            <label className="field-label" htmlFor="target-role">
              Target role
            </label>
            <input
              id="target-role"
              value={role}
              maxLength={200}
              onChange={(e) => setRole(e.target.value)}
            />
            <label className="field-label" htmlFor="behavioral-focus">
              Focus
            </label>
            <textarea
              id="behavioral-focus"
              value={focus}
              maxLength={500}
              rows={3}
              onChange={(e) => setFocus(e.target.value)}
            />
            <PresetPicker
              presets={behavioralPresets}
              style={preset}
              setStyle={setPreset}
              prompt={prompt}
              setPrompt={setPrompt}
              id="behavioral-prompt"
            />
            <div className="start-area">
              <button
                className="primary start"
                disabled={
                  !resume ||
                  !resumeText.trim() ||
                  !prompt.trim() ||
                  uploading ||
                  starting ||
                  !hasKey
                }
                onClick={start}
              >
                {starting ? "Starting…" : "Start"}
                <ArrowRight size={16} />
              </button>
              {!hasKey ? (
                <KeyNotice navigate={navigate} />
              ) : (
                !resume && (
                  <span className="match-count">Upload a résumé to start.</span>
                )
              )}
            </div>
            <ErrorBanner error={startError} />
          </section>
        </aside>
      </div>
    </main>
  );
}
export function ResumePane({ resume, targetRole, focus }) {
  return (
    <section className="statement-pane resume-pane">
      <div className="statement-scroll">
        <div className="meta">
          {targetRole} · {resume.filename}
        </div>
        <h1>{resume.name || "Résumé"}</h1>
        <p className="focus-note">{focus}</p>
        <div className="resume-context">{resume.text}</div>
      </div>
    </section>
  );
}
