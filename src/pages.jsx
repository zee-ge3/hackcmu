import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { behavioralPresets } from "./behavioral.mjs";
import { api } from "./api.mjs";
export function SiteHeader({ path, navigate }) {
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
      <div className="avatar">You</div>
    </header>
  );
}
export function Home({ navigate }) {
  return (
    <main className="home-page">
      <div className="home-intro">
        <div className="eyebrow">
          <span className="live-dot" /> YOUR NEXT ROLE STARTS HERE
        </div>
        <h1>
          A little practice.
          <br />
          <span>A lot more confidence.</span>
        </h1>
        <p>
          Pick your interview. Think out loud.
          <br />
          Leave knowing what to work on next.
        </p>
      </div>
      <div className="mode-grid">
        <a
          className="mode-card coding-mode"
          href="/coding"
          onClick={(e) => {
            e.preventDefault();
            navigate("/coding");
          }}
        >
          <span className="mode-icon">
            <Code2 size={26} />
          </span>
          <span className="eyebrow">01 / TECHNICAL</span>
          <h2>Work through the problem.</h2>
          <p>
            A shared coding editor, real test cases, and an interviewer who
            follows your thinking.
          </p>
          <div className="mode-tags">
            <span>LeetCode library</span>
            <span>JavaScript & Python</span>
            <span>Whiteboard</span>
          </div>
          <div className="mode-cta">
            Practice coding
            <ArrowRight size={19} />
          </div>
        </a>
        <a
          className="mode-card behavioral-mode"
          href="/behavioral"
          onClick={(e) => {
            e.preventDefault();
            navigate("/behavioral");
          }}
        >
          <span className="mode-icon">
            <Mic size={26} />
          </span>
          <span className="eyebrow">02 / BEHAVIORAL</span>
          <h2>Tell your story.</h2>
          <p>
            Turn your experience into clear, specific answers with a
            conversation grounded in your résumé.
          </p>
          <div className="mode-tags">
            <span>Résumé context</span>
            <span>Personal follow-ups</span>
            <span>Rubric feedback</span>
          </div>
          <div className="mode-cta">
            Practice behavioral
            <ArrowRight size={19} />
          </div>
        </a>
      </div>
      <div className="home-foot">
        <span>
          <Mic size={15} /> Natural voice, interruptions welcome.
        </span>
        <span>
          <PenTool size={15} /> Draw when words aren’t enough.
        </span>
        <span>
          <Check size={15} /> Feedback you can act on.
        </span>
      </div>
    </main>
  );
}
export function BehavioralSetup({ onStart }) {
  const [resume, setResume] = useState(null),
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
  async function upload(file) {
    if (!file) return;
    const version = ++uploadVersion.current;
    setError("");
    setResume(null);
    setResumeText("");
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
        setResume(result);
        setResumeText(result.profile.fullText);
      }
    } catch (e) {
      if (version === uploadVersion.current) setError(e.message);
    } finally {
      if (version === uploadVersion.current) setUploading(false);
    }
  }
  async function start() {
    setStarting(true);
    setError("");
    try {
      onStart(
        await api("/api/interviews", {
          mode: "behavioral",
          resumeId: resume.id,
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
        <p>Bring your résumé. We’ll help you make it clear.</p>
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
          <label className={"upload-zone " + (uploading ? "uploading" : "")}>
            <Upload size={24} />
            <strong>
              {uploading
                ? "Reading your résumé…"
                : resume
                  ? "Replace résumé"
                  : "Choose your résumé"}
            </strong>
            <span>PDF, DOCX, or TXT · up to 5 MB</span>
            <input
              type="file"
              aria-label="Upload résumé"
              accept=".pdf,.docx,.txt"
              disabled={uploading}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <p className="upload-note">
            Processed by OpenAI to prepare your interview. Review the extracted
            text before starting.
          </p>
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
              <p className="upload-note">
                Alex uses the reviewed text above, including any corrections you
                make.
              </p>
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
                starting
              }
              onClick={start}
            >
              {starting ? "Preparing your interview…" : "Enter behavioral room"}
              <ArrowRight size={18} />
            </button>
            <p>Alex connects and greets you when you enter.</p>
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
