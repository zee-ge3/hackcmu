import React, { useState, useRef, useEffect } from "react";
import {
  Braces,
  Code2,
  Mic,
  ArrowRight,
  ArrowUpRight,
  Upload,
  FileText,
  Check,
  PenTool,
  Trash2,
  KeyRound,
  Dices,
  Network,
} from "lucide-react";
import { useAccount, GoogleSignIn } from "./account.jsx";
import { behavioralPresets } from "./behavioral.mjs";
import { api } from "./api.mjs";
export function KeyNotice({ navigate }) {
  return (
    <p className="key-notice">
      <KeyRound size={13} />
      Add your OpenAI API key on your{" "}
      <a
        href="/profile"
        onClick={(e) => {
          e.preventDefault();
          navigate("/profile");
        }}
      >
        profile
      </a>{" "}
      to enter the room.
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
          <Braces size={23} />
        </span>
        pairwise<span className="beta">BETA</span>
      </a>
      <nav>
        {[
          ["/", "Overview"],
          ["/coding", "Coding"],
          ["/probability", "Probability"],
          ["/design", "System design"],
          ["/behavioral", "Behavioral"],
          ...(user ? [["/profile", "Profile"]] : []),
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
          className="account-link"
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
  const go = (url) => (e) => {
    e.preventDefault();
    navigate(url);
  };
  const rooms = [
    {
      url: "/coding",
      n: "01",
      title: "Coding",
      icon: Code2,
      lead: "LeetCode problems in a shared editor with prepared tests and a step-through debugger.",
      detail:
        "JavaScript or Python · Blind 75 and NeetCode 150 filters · 677 prepared test cases",
    },
    {
      url: "/probability",
      n: "02",
      title: "Probability",
      icon: Dices,
      lead: "Quant-style questions from trading-firm screens and competition math, checked against reference answers.",
      detail:
        "679 questions · hints only until you solve · notes pad and whiteboard",
    },
    {
      url: "/design",
      n: "03",
      title: "System design",
      icon: Network,
      lead: "A brief, a clock, and constraints that keep arriving while you draw the architecture.",
      detail:
        "12 systems or your own brief · 20–45 minutes · timed constraint reveals",
    },
    {
      url: "/behavioral",
      n: "04",
      title: "Behavioral",
      icon: Mic,
      lead: "Questions grounded in your own résumé, with follow-ups on ownership, impact, and judgment.",
      detail:
        "PDF, DOCX, or TXT résumé · saved to your profile · story-structure rubric",
    },
  ];
  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> VOICE INTERVIEW PRACTICE
          </span>
          <h1>An interviewer that listens, pushes back, and grades you.</h1>
          <p>
            Pairwise runs a real-time spoken interview in four formats. You
            talk, code, and draw; Alex asks follow-ups, edits alongside you, and
            scores the session on a fixed rubric so you know what to fix next.
          </p>
          <div className="hero-actions">
            <a
              className="primary hero-cta"
              href="/coding"
              onClick={go("/coding")}
            >
              Start a coding session <ArrowRight size={17} />
            </a>
            <a className="hero-link" href="/profile" onClick={go("/profile")}>
              See your progress <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="hero-panel" aria-hidden="true">
          <div className="hero-row">
            <span className="hero-speaker">Alex</span>
            <p>
              Walk me through what happens when two intervals overlap only at an
              endpoint.
            </p>
          </div>
          <div className="hero-row you">
            <span className="hero-speaker">You</span>
            <p>
              Then the intersection is a single point — measure zero, so it
              doesn't change the probability.
            </p>
          </div>
          <div className="hero-row">
            <span className="hero-speaker">Alex</span>
            <p>Good. So what's the sample space you're counting over?</p>
          </div>
          <div className="hero-meter">
            <span>Problem framing</span>
            <i style={{ width: "72%" }} />
            <span>Reasoning</span>
            <i style={{ width: "58%" }} />
            <span>Verification</span>
            <i style={{ width: "40%" }} />
          </div>
        </div>
      </section>
      <section className="rooms">
        {rooms.map((r) => (
          <a key={r.url} className="room" href={r.url} onClick={go(r.url)}>
            <div className="room-head">
              <span className="room-n">{r.n}</span>
              <r.icon size={18} />
            </div>
            <h2>{r.title}</h2>
            <p>{r.lead}</p>
            <small>{r.detail}</small>
            <span className="room-cta">
              Enter <ArrowRight size={14} />
            </span>
          </a>
        ))}
      </section>
      <section className="how">
        <div>
          <span className="eyebrow muted">HOW A SESSION RUNS</span>
          <h3>Three steps, then a report you can act on.</h3>
        </div>
        <ol>
          <li>
            <strong>Set up</strong>
            <span>
              Pick the format, filters, and interviewer style. Your microphone
              connects on entry.
            </span>
          </li>
          <li>
            <strong>Work it through</strong>
            <span>
              Speak, code, draw. Alex sees the editor and the whiteboard and
              delegates hard reasoning to a backend model.
            </span>
          </li>
          <li>
            <strong>Get graded</strong>
            <span>
              Five fixed criteria per format, evidence for each score, and
              history that shows where you keep slipping.
            </span>
          </li>
        </ol>
      </section>
      <footer className="home-foot">
        <span>Runs on your own OpenAI key</span>
        <span>Google sign-in · résumés and feedback stay on your profile</span>
        <span>Local-first: sessions live in memory until you finish</span>
      </footer>
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
    [error, setError] = useState("");
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
      .catch((e) => setError(e.message));
  }, []);
  async function upload(file) {
    if (!file) return;
    const version = ++uploadVersion.current;
    setError("");
    if (
      !/\.(pdf|docx|txt)$/i.test(file.name) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    ) {
      setError("Choose a PDF, DOCX, or TXT résumé under 5 MB.");
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
      if (version === uploadVersion.current) setError(e.message);
    } finally {
      if (version === uploadVersion.current) setUploading(false);
    }
  }
  async function remove(record) {
    setError("");
    try {
      await api(`/api/resumes/${record.id}`, undefined, "DELETE");
      const rest = resumes.filter((r) => r.id !== record.id);
      setResumes(rest);
      if (selected === record.id) choose(rest[0]);
    } catch (e) {
      setError(e.message);
    }
  }
  async function start() {
    setStarting(true);
    setError("");
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
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }
  return (
    <main className="mode-setup behavioral-setup">
      <div className="page-heading">
        <span className="eyebrow muted">BEHAVIORAL PRACTICE</span>
        <h1>There’s a story in your experience.</h1>
      </div>
      <div className="behavioral-grid">
        <section className="card resume-upload-card">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">01 / YOUR BACKGROUND</span>
              <h2>Start with your résumé</h2>
            </div>
            <FileText size={21} />
          </div>
          {resumes?.length > 0 && (
            <div className="resume-picker" role="radiogroup">
              {resumes.map((r) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={r.id === selected}
                  key={r.id}
                  className={
                    "resume-option " + (r.id === selected ? "selected" : "")
                  }
                  onClick={() => choose(r)}
                >
                  {r.id === selected ? (
                    <Check size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <div>
                    <strong>{r.filename}</strong>
                    <small>
                      {r.profile.name || "Unnamed"} · saved{" "}
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </small>
                  </div>
                  <span
                    role="button"
                    aria-label={`Delete ${r.filename}`}
                    className="resume-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(r);
                    }}
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <label className={"upload-zone " + (uploading ? "uploading" : "")}>
            <Upload size={24} />
            <strong>
              {uploading
                ? "Reading your résumé…"
                : resumes?.length
                  ? "Upload another résumé"
                  : "Choose your résumé"}
            </strong>
            <span>PDF, DOCX, or TXT · up to 5 MB</span>
            <input
              type="file"
              aria-label="Upload résumé"
              accept=".pdf,.docx,.txt"
              disabled={uploading || !hasKey}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          {resume && (
            <div className="resume-review">
              <div className="parsed-badge">
                <Check size={14} />
                Parsed · {resume.filename}
              </div>
              <h3>{resume.profile.name || "Your background"}</h3>
              <p>{resume.profile.summary}</p>
              <div className="chips">
                {resume.profile.skills.slice(0, 10).map((skill, i) => (
                  <span className="chip" key={i}>
                    {skill}
                  </span>
                ))}
              </div>
              <label className="field-label" htmlFor="resume-text">
                Review and correct your context
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
        <section className="card behavioral-options">
          <span className="eyebrow muted">02 / THE CONVERSATION</span>
          <h2>Make it relevant.</h2>
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
            What would you like to practice?
          </label>
          <textarea
            id="behavioral-focus"
            value={focus}
            maxLength={500}
            rows={3}
            onChange={(e) => setFocus(e.target.value)}
          />
          <label className="field-label">Interviewer style</label>
          <div className="behavioral-presets">
            {behavioralPresets.map((p) => (
              <button
                type="button"
                key={p.id}
                className={"preset " + (preset === p.id ? "selected" : "")}
                onClick={() => {
                  setPreset(p.id);
                  setPrompt(p.prompt);
                }}
              >
                <strong>{p.name}</strong>
                <span>{p.description}</span>
              </button>
            ))}
          </div>
          <details className="prompt-details">
            <summary>Customize interviewer system prompt</summary>
            <label htmlFor="behavioral-prompt">
              Instructions for this interview
            </label>
            <textarea
              id="behavioral-prompt"
              rows={7}
              maxLength={6000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </details>
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
              {starting ? "Preparing your interview…" : "Enter behavioral room"}
              <ArrowRight size={18} />
            </button>
            {!hasKey && <KeyNotice navigate={navigate} />}
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
export function ResumePane({ resume, targetRole, focus }) {
  return (
    <section className="statement-pane resume-pane">
      <div className="pane-tabs">
        <span>
          <FileText size={14} /> YOUR RÉSUMÉ
        </span>
      </div>
      <div className="statement-scroll">
        <span className="eyebrow muted">BEHAVIORAL INTERVIEW</span>
        <h1>{resume.name || "Your experience"}</h1>
        <div className="resume-role">{targetRole}</div>
        <p className="focus-note">{focus}</p>
        <div className="resume-context">{resume.text}</div>
      </div>
      <div className="problem-bottom">
        <span>Context from {resume.filename}</span>
      </div>
    </section>
  );
}
