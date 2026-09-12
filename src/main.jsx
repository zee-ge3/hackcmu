import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Headphones,
  Mic,
  MicOff,
  Play,
  Square,
  Terminal,
  Timer,
  Volume2,
  X,
  Search,
  Download,
  Braces,
} from "lucide-react";
import {
  interviewerPresets,
  rubric,
  scoreLabels,
  groupTranscript,
} from "./interviewer.mjs";
import { filterProblems } from "./domain.mjs";
import { LiveConnection } from "./live.mjs";
import { runCode } from "./runner.mjs";
import "./style.css";
import { api } from "./api.mjs";
import { SiteHeader, Home, BehavioralSetup, ResumePane } from "./pages.jsx";
import { behavioralRubric } from "./behavioral.mjs";
import Whiteboard from "./Whiteboard.jsx";
import Debugger from "./Debugger.jsx";
import { Testcases, TestResult, verdict } from "./TestPanel.jsx";
import { buildCustomSuite, resolveRunMode } from "./domain.mjs";
import {
  asksQuiet,
  spokenResult,
  reengages,
  checkInDue,
  checkInRequest,
} from "./voice.mjs";
import { lineDiff, lineOps } from "./diff.mjs";
import { DiffEditor } from "@monaco-editor/react";
import { Bug, GitCompare } from "lucide-react";
import { AccountProvider, useAccount, SignInGate } from "./account.jsx";
import { Profile } from "./profile.jsx";
import { KeyNotice } from "./pages.jsx";
import { ProbabilitySetup, DesignSetup } from "./setups.jsx";
import { PresetPicker } from "./PresetPicker.jsx";
import { Loader2, PenTool, RotateCcw } from "lucide-react";
import { ProbabilityPane, DesignPane, NotesEditor } from "./rooms.jsx";
import { probabilityRubric, designRubric } from "./modes.mjs";
import { NotebookPen } from "lucide-react";
self.MonacoEnvironment = {
  getWorker: (_moduleId, label) =>
    ["javascript", "typescript"].includes(label)
      ? new TypeScriptWorker()
      : new EditorWorker(),
};
loader.config({ monaco });
const defaultFilters = {
  testedOnly: true,
  companies: [],
  topics: [],
  lists: [],
  pinned: [],
  difficulty: "all",
  search: "",
};
function CodingSetup({ onStart, navigate }) {
  const { user } = useAccount();
  const hasKey = !!user?.openaiKeyHint;
  const [catalog, setCatalog] = useState([]),
    [filters, setFilters] = useState(defaultFilters),
    [count, setCount] = useState(2),
    [language, setLanguage] = useState("javascript"),
    [debuggerEnabled, setDebuggerEnabled] = useState(false),
    [style, setStyle] = useState(interviewerPresets[0].id),
    [prompt, setPrompt] = useState(interviewerPresets[0].prompt),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    api("/api/catalog", undefined, "GET")
      .then((d) => {
        setCatalog(d.problems);
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  const matching = filterProblems(catalog, filters).filter((p) => !p.paid_only);
  const pinned = filters.pinned
    .map((slug) => catalog.find((p) => p.slug === slug))
    .filter(Boolean);
  const total = Math.max(count, pinned.length);
  async function start() {
    setLoading(true);
    setError("");
    try {
      onStart(
        await api("/api/interviews", {
          ...filters,
          count: total,
          language,
          debuggerEnabled,
          interviewerStyle: style,
          interviewerPrompt: prompt,
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  const companies = [
    ...new Set(catalog.flatMap((p) => Object.keys(p.companies))),
  ].sort();
  const topics = [...new Set(catalog.flatMap((p) => p.tags))].sort();
  const toggle = (key, value) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((x) => x !== value)
        : [...f[key], value],
    }));
  // Featured chips plus a picker for the long tail; picked extras show as chips.
  const chipFilter = (key, featured, all, label, prompt) => (
    <>
      <label className="field-label">{label}</label>
      <div className="chips">
        {featured.map((v) => (
          <button
            key={v}
            className={"chip " + (filters[key].includes(v) ? "selected" : "")}
            onClick={() => toggle(key, v)}
          >
            {filters[key].includes(v) && <Check size={13} />} {v}
          </button>
        ))}
        {filters[key]
          .filter((v) => !featured.includes(v))
          .map((v) => (
            <button
              className="chip selected"
              key={v}
              onClick={() => toggle(key, v)}
            >
              {v}
              <X size={12} />
            </button>
          ))}
      </div>
      <select
        aria-label={`Add ${label.toLowerCase().replace(/s$/, "")}`}
        value=""
        onChange={(e) => {
          if (e.target.value) toggle(key, e.target.value);
        }}
      >
        <option value="">{prompt}</option>
        {all.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </>
  );
  return (
    <main className="setup page">
      <header className="page-head">
        <h1>Coding</h1>
      </header>
      <div className="setup-grid">
        <section className="config card">
          <h2>Problems</h2>
          <div className="search">
            <Search size={16} />
            <input
              aria-label="Search problem library"
              placeholder="Search by name or number"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          {chipFilter(
            "companies",
            ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Bloomberg"],
            companies,
            "Companies",
            "Add company…",
          )}
          <label className="field-label">Difficulty</label>
          <div className="segmented">
            {["all", "easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => setFilters({ ...filters, difficulty: d })}
                className={filters.difficulty === d ? "active" : ""}
              >
                {d === "all" ? "Mixed" : d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          {chipFilter(
            "topics",
            [
              "Array",
              "String",
              "Hash Table",
              "Dynamic Programming",
              "Tree",
              "Graph",
            ],
            topics,
            "Topics",
            "Add topic…",
          )}
          <label className="field-label">Lists</label>
          <div className="chips">
            {[
              ["blind75", "Blind 75"],
              ["neetcode150", "NeetCode 150"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={
                  "chip " + (filters.lists.includes(id) ? "selected" : "")
                }
                onClick={() => toggle("lists", id)}
              >
                {filters.lists.includes(id) && <Check size={13} />} {label}{" "}
                <small>
                  {catalog.filter((p) => p.lists?.includes(id)).length}
                </small>
              </button>
            ))}
          </div>
          <label className="test-filter">
            <input
              type="checkbox"
              checked={filters.testedOnly}
              onChange={(e) =>
                setFilters({ ...filters, testedOnly: e.target.checked })
              }
            />
            <span>
              Prepared tests only{" "}
              <small>{catalog.filter((p) => p.testCount > 0).length}</small>
            </span>
          </label>
          <h2>Session</h2>
          <div className="two-fields">
            <div>
              <label className="field-label" htmlFor="count">
                Problems
              </label>
              <div className="stepper">
                <button
                  aria-label="Fewer problems"
                  disabled={count <= 1}
                  onClick={() => setCount(count - 1)}
                >
                  −
                </button>
                <input
                  id="count"
                  type="number"
                  min="1"
                  max="10"
                  value={count}
                  onChange={(e) =>
                    setCount(
                      Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                    )
                  }
                />
                <button
                  aria-label="More problems"
                  disabled={count >= 10}
                  onClick={() => setCount(count + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="language">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python3">Python 3</option>
              </select>
            </div>
          </div>
          <label className="field-label">Tools</label>
          <label className="test-filter">
            <input
              type="checkbox"
              checked={debuggerEnabled}
              onChange={(e) => setDebuggerEnabled(e.target.checked)}
            />
            <span>
              Debugger <small>step through a testcase</small>
            </span>
          </label>
          <PresetPicker
            presets={interviewerPresets}
            style={style}
            setStyle={setStyle}
            prompt={prompt}
            setPrompt={setPrompt}
            id="interviewer-prompt"
          />
          <div className="start-area">
            <button
              className="primary start"
              onClick={start}
              disabled={
                loading ||
                matching.filter((p) => !filters.pinned.includes(p.slug))
                  .length +
                  pinned.length <
                  total ||
                !prompt.trim() ||
                !hasKey
              }
            >
              {loading
                ? "Starting…"
                : pinned.length
                  ? `Start · ${pinned.length} pinned`
                  : "Start"}
              <ArrowRight size={16} />
            </button>
            {ready && matching.length < count && (
              <span className="match-count">Only {matching.length} match</span>
            )}
            {pinned.length > 0 && (
              <button
                className="quiet"
                onClick={() => setFilters({ ...filters, pinned: [] })}
              >
                Clear pins
              </button>
            )}
            {!hasKey && <KeyNotice navigate={navigate} />}
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
        </section>
        <aside>
          <section className="library card">
            <h2>
              Matches <small>{matching.length.toLocaleString()}</small>
              <small className="hint">click to pin</small>
            </h2>
            <div className="problem-list">
              {[
                ...pinned,
                ...matching.filter((p) => !filters.pinned.includes(p.slug)),
              ]
                .slice(0, 30)
                .map((p) => {
                  const on = filters.pinned.includes(p.slug);
                  return (
                    <button
                      type="button"
                      className={"problem-row " + (on ? "pinned" : "")}
                      key={p.id}
                      aria-pressed={on}
                      onClick={() => toggle("pinned", p.slug)}
                    >
                      <span className="problem-id">
                        {on ? <Check size={12} /> : p.id}
                      </span>
                      <span>{p.title}</span>
                      <span className={"difficulty " + p.difficulty}>
                        {p.difficulty}
                      </span>
                    </button>
                  );
                })}
              {ready && !matching.length && (
                <p className="muted">No matches.</p>
              )}
              {matching.length > 30 && (
                <p className="muted">
                  +{(matching.length - 30).toLocaleString()} more
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function App() {
  const { user, loading } = useAccount();
  const [path, setPath] = useState(window.location.pathname),
    [session, setSession] = useState(null),
    [error, setError] = useState("");
  function navigate(url) {
    window.history.pushState({}, "", url);
    setPath(url);
    setSession(null);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    const back = () => {
      setPath(window.location.pathname);
      setSession(null);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  // Sessions live at /session/<id>, so a refresh (or back/forward) rejoins the
  // room instead of losing it; the server keeps the interview for hours.
  const sessionId = path.startsWith("/session/") ? path.slice(9) : null;
  useEffect(() => {
    if (!sessionId || !user || session?.id === sessionId) return;
    let cancelled = false;
    api(`/api/interviews/${sessionId}`, undefined, "GET")
      .then((s) => {
        if (cancelled) return;
        // A graded interview is read-only: its feedback lives on the profile.
        if (s.finished) navigate("/profile");
        else setSession(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user]);
  const startSession = (s) => {
    window.history.pushState({}, "", `/session/${s.id}`);
    setPath(`/session/${s.id}`);
    setSession(s);
  };
  if (session)
    return <Workspace session={session} onExit={() => navigate("/")} />;
  const gated =
    ["/coding", "/behavioral", "/probability", "/design", "/profile"].includes(
      path,
    ) || !!sessionId;
  return (
    <div className="app-shell">
      <SiteHeader path={path} navigate={navigate} />
      {gated && loading ? (
        <main className="setup">
          <p className="muted">Checking your account…</p>
        </main>
      ) : gated && !user ? (
        <SignInGate />
      ) : sessionId ? (
        <main className="setup page">
          {error ? (
            <div className="error">
              {error}{" "}
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                }}
              >
                Home
              </a>
            </div>
          ) : (
            <p className="muted">Rejoining…</p>
          )}
        </main>
      ) : path === "/coding" ? (
        <CodingSetup onStart={startSession} navigate={navigate} />
      ) : path === "/behavioral" ? (
        <BehavioralSetup onStart={startSession} navigate={navigate} />
      ) : path === "/probability" ? (
        <ProbabilitySetup onStart={startSession} navigate={navigate} />
      ) : path === "/design" ? (
        <DesignSetup onStart={startSession} navigate={navigate} />
      ) : path === "/profile" ? (
        <Profile navigate={navigate} />
      ) : (
        <Home navigate={navigate} />
      )}
    </div>
  );
}
function Workspace({ session: initial, onExit }) {
  const mode = initial.mode;
  const isBehavioral = mode === "behavioral",
    isProbability = mode === "probability",
    isDesign = mode === "design",
    hasCode = mode === "coding",
    usesNotes = isProbability || isDesign;
  const gradingRubric =
    {
      coding: rubric,
      behavioral: behavioralRubric,
      probability: probabilityRubric,
      design: designRubric,
    }[mode] || rubric;
  const [workspaceTab, setWorkspaceTab] = useState(
    hasCode ? "code" : usesNotes ? "notes" : "canvas",
  );
  // Boards restored from the server on rejoin: strokes repaint, and the revision
  // counter continues past the server's last accepted value.
  const boards = useRef(
    Object.fromEntries(
      Object.entries(initial.boards || {}).map(([i, b]) => [
        i,
        {
          strokes: b.strokes || [],
          revision: b.revision || 0,
          ack: b.revision || 0,
          summary: b.summary || "",
        },
      ]),
    ),
  );
  const [index, setIndex] = useState(initial.index || 0),
    [editors, setEditors] = useState(initial.editors),
    [code, setCode] = useState(initial.editors[initial.index || 0]?.code || ""),
    [voice, setVoice] = useState("offline"),
    [muted, setMuted] = useState(false),
    [transcript, setTranscript] = useState(initial.transcript || []),
    [activity, setActivity] = useState(""),
    [busy, setBusy] = useState(false),
    [running, setRunning] = useState(null),
    [panelHeight, setPanelHeight] = useState(300),
    [output, setOutput] = useState(null),
    [error, setError] = useState(""),
    [elapsed, setElapsed] = useState(0),
    [feedback, setFeedback] = useState(null),
    [ending, setEnding] = useState(false),
    [saved, setSaved] = useState("Saved"),
    [pendingEdit, setPendingEdit] = useState(null),
    [showDiff, setShowDiff] = useState(false),
    [bottomTab, setBottomTab] = useState("testcase"),
    [customTests, setCustomTests] = useState(
      initial.customTests || initial.problems.map(() => []),
    ),
    [editorInstance, setEditorInstance] = useState(null),
    [attempts, setAttempts] = useState(initial.attempts || []),
    [solutions, setSolutions] = useState(() =>
      Object.fromEntries(
        (initial.solutions || []).map((s, i) => [i, s]).filter(([, s]) => s),
      ),
    ),
    [answering, setAnswering] = useState(false),
    [design, setDesign] = useState(initial.design || null),
    [stages, setStages] = useState(initial.problems[0]?.stages || []),
    [quiet, setQuiet] = useState(false),
    [stageBusy, setStageBusy] = useState(false),
    [hints, setHints] = useState({}),
    [resetArmed, setResetArmed] = useState(false);
  const state = useRef({
      index: initial.index || 0,
      editors: initial.editors,
      code: initial.editors[initial.index || 0]?.code || "",
      transcript: initial.transcript || [],
      busy: false,
      runResult: "",
      debugTrace: "",
      customTests: initial.customTests || initial.problems.map(() => []),
      runInFlight: false,
      transcriptTimer: null,
      lastSpeechAt: Date.now(),
      lastActivityAt: 0,
      lastCheckInAt: Date.now(),
      checkIns: 0,
      typing: false,
      quietUntil: 0,
      quietGraceUntil: 0,
      quietTimer: null,
      customAttempt: null,
      timeUp: false,
      utterance: "",
      utteranceAt: 0,
      problemStartedAt: Date.now(),
      timeSpent: {},
      nudged: {},
      runs: initial.runs || {},
      segment: Math.max(
        0,
        ...(initial.transcript || []).map((f) => f.segment || 0),
      ),
      seenEvents: new Set(),
      ending: false,
    }),
    live = useRef(null),
    saveChain = useRef(Promise.resolve()),
    captions = useRef(null),
    followCaptions = useRef(true),
    codeRef = useRef(null),
    editDecorations = useRef([]),
    testsTimer = useRef(null),
    pendingTests = useRef(null),
    testsChain = useRef(Promise.resolve()),
    debuggerRef = useRef(null),
    debugSuiteRef = useRef(null);
  const problem = initial.problems[index];
  const base = `/api/interviews/${initial.id}`;
  const captionRows = groupTranscript(transcript);
  useEffect(() => {
    connect();
  }, []);
  // "Give me a minute" / "shut up" puts the interviewer on hold: no check-ins,
  // no spoken run results, and the live agent is told to stay silent until
  // the candidate addresses it again.
  function heardUser(delta) {
    const c = state.current;
    const now = Date.now();
    if (now - c.utteranceAt > 4000) c.utterance = "";
    c.utteranceAt = now;
    c.utterance = (c.utterance + delta).slice(-400);
    // Judge the utterance once it has paused, so "Wait, is this O(n)?" is a question.
    clearTimeout(c.quietTimer);
    c.quietTimer = setTimeout(judgeUtterance, 1200);
  }
  function judgeUtterance() {
    const c = state.current;
    const now = Date.now();
    if (asksQuiet(c.utterance)) {
      c.quietGraceUntil = now + 8000;
      if (!(c.quietUntil > now)) {
        c.quietUntil = now + 10 * 60 * 1000;
        setQuiet(true);
        live.current?.send(
          "session.instructions.append",
          "The candidate asked for silence. Reply with at most three words now, then say nothing at all until they speak to you again, even if tests run or code changes.",
        );
      }
      c.utterance = "";
      return;
    }
    if (
      c.quietUntil > now &&
      now > (c.quietGraceUntil || 0) &&
      reengages(c.utterance)
    ) {
      endQuiet();
    }
  }
  const isQuiet = () => state.current.quietUntil > Date.now();
  function endQuiet() {
    state.current.quietUntil = 0;
    setQuiet(false);
    live.current?.send(
      "session.instructions.append",
      "The candidate is talking to you again. Resume the normal interview style.",
    );
  }
  // Time budget per problem (a realistic pace), used for the clock and two nudges.
  const budgetSeconds = (p) =>
    !p
      ? 0
      : isProbability
        ? 600
        : { easy: 15, medium: 25, hard: 40 }[
            String(p.difficulty).toLowerCase()
          ] * 60 || 1500;
  const [problemElapsed, setProblemElapsed] = useState(0);
  useEffect(() => {
    setProblemElapsed(
      Math.floor(
        ((state.current.timeSpent[state.current.index] || 0) +
          (Date.now() - state.current.problemStartedAt)) /
          1000,
      ),
    );
  }, [elapsed]);
  useEffect(() => {
    if (
      !(hasCode || isProbability) ||
      !live.current?.ready ||
      isQuiet() ||
      feedback
    )
      return;
    const budget = budgetSeconds(problem);
    if (!budget) return;
    const c = state.current;
    const level =
      problemElapsed >= budget ? 2 : problemElapsed >= budget * 0.8 ? 1 : 0;
    if (level > (c.nudged[index] || 0)) {
      c.nudged[index] = level;
      c.lastCheckInAt = Date.now();
      live.current.send(
        "session.commentary.append",
        level === 2
          ? "We're at time on this one. Wrap up your current thought: finish, or move on?"
          : `About ${Math.max(1, Math.round((budget - problemElapsed) / 60))} minutes left on this one. Where are you?`,
      );
    }
  }, [problemElapsed]);
  // A silent candidate still gets an interviewer: after a minute without
  // speech the backend is asked for a short spoken check-in (acknowledging
  // visible progress when there is any), backing off while they stay quiet.
  // If the backend cannot answer, the voice agent is told to check in itself.
  useEffect(() => {
    const timer = setInterval(async () => {
      const c = state.current;
      const now = Date.now();
      if (quiet && !(c.quietUntil > now)) endQuiet();
      if (
        !live.current?.ready ||
        c.busy ||
        c.ending ||
        feedback ||
        !checkInDue(c, now)
      )
        return;
      const coding = c.lastActivityAt > c.lastCheckInAt;
      c.lastCheckInAt = now;
      c.checkIns = (c.checkIns || 0) + 1;
      const spoken = await ask(checkInRequest(coding)).catch(() => null);
      if (!spoken && live.current?.ready && !isQuiet())
        live.current.send(
          "session.instructions.append",
          coding
            ? "The candidate has been coding silently for over a minute. Check in now in one short sentence: acknowledge that they are making progress and ask them to talk through the step they are on."
            : "The candidate has been silent for over a minute. Check in now in one short sentence: ask whether they want to think out loud or have a question about the problem.",
        );
    }, 15000);
    return () => clearInterval(timer);
  }, [feedback, quiet]);
  // Dev-only hook so browser tests can drive the agent path without voice.
  useEffect(() => {
    if (import.meta.env.DEV)
      window.__pairwise = { ask, code: () => codeRef.current?.getValue() };
  });
  // Design rooms: reveal the next constraint on its timer and flag the time limit.
  useEffect(() => {
    if (!isDesign || !design || feedback) return;
    const elapsedMs = elapsed * 1000;
    if (
      design.nextAt !== null &&
      elapsedMs >= design.nextAt * design.durationMs &&
      !stageBusy
    )
      void advanceStage("timer");
    if (elapsedMs >= design.durationMs && !state.current.timeUp) {
      state.current.timeUp = true;
      live.current?.send(
        "session.thinking.append",
        "The time limit is reached. Ask the candidate to summarize the final design briefly, then suggest they finish the interview.",
      );
    }
  }, [elapsed]);
  useEffect(() => {
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - initial.createdAt) / 1000)),
      1000,
    );
    return () => {
      clearInterval(timer);
      live.current?.cleanup();
    };
  }, []);
  function changeCode(value) {
    if (state.current.typing) return;
    value = value || "";
    state.current.code = value;
    state.current.lastActivityAt = Date.now();
    setCode(value);
    setSaved("");
  }
  // Code that arrived from Alex: adopted without counting as candidate activity.
  function adoptCode(value) {
    state.current.code = value;
    setCode(value);
    setSaved("Saved");
  }
  const addedLine = (line) => ({
    range: {
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: 1,
    },
    options: {
      isWholeLine: true,
      className: "agent-added",
      linesDecorationsClassName: "agent-added-gutter",
    },
  });
  // Alex's edits are typed into the editor the way a person would make them:
  // removed lines go first, then each new line is opened and typed in small
  // chunks, marked git-style in the gutter. The whole edit lands within about
  // six seconds however large it is; the editor is read-only meanwhile.
  async function typeEdit(before, after, target, reason) {
    const editor = codeRef.current;
    const model = editor?.getModel();
    const ops =
      model && !model.isDisposed() && model.getValue() === before
        ? lineOps(before, after)
        : null;
    const valid = () =>
      state.current.index === target &&
      codeRef.current === editor &&
      !model.isDisposed();
    if (!ops) {
      if (state.current.index !== target) return;
      adoptCode(after);
      highlightEdit(before, after);
      return;
    }
    const c = state.current;
    c.typing = true;
    editor.updateOptions({ readOnly: true });
    setActivity(reason ? `Alex is typing · ${reason}` : "Alex is typing");
    const chars = ops
      .filter((o) => o.op === "add")
      .reduce((n, o) => n + o.text.length + 1, 0);
    const perChar = Math.min(16, 5000 / Math.max(chars, 1));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const at = (line, column) => ({
      startLineNumber: line,
      startColumn: column,
      endLineNumber: line,
      endColumn: column,
    });
    const added = [];
    // A model always has one line, so an empty document is one blank line
    // that the first typed line must reuse rather than push down.
    let docLines = before.split("\n").length;
    let line = 1;
    let aborted = false;
    try {
      for (const o of ops) {
        if (!valid()) {
          aborted = true;
          break;
        }
        if (o.op === "keep") {
          line++;
          continue;
        }
        if (o.op === "del") {
          docLines--;
          const last = model.getLineCount();
          model.applyEdits([
            {
              range:
                line < last
                  ? {
                      startLineNumber: line,
                      startColumn: 1,
                      endLineNumber: line + 1,
                      endColumn: 1,
                    }
                  : {
                      startLineNumber: Math.max(1, line - 1),
                      startColumn:
                        line > 1 ? model.getLineMaxColumn(line - 1) : 1,
                      endLineNumber: line,
                      endColumn: model.getLineMaxColumn(line),
                    },
              text: "",
            },
          ]);
          await sleep(45);
          continue;
        }
        if (docLines === 0) {
          // nothing to push down: type into the blank line
        } else if (line <= model.getLineCount())
          model.applyEdits([{ range: at(line, 1), text: "\n" }]);
        else {
          const end = model.getLineCount();
          model.applyEdits([
            { range: at(end, model.getLineMaxColumn(end)), text: "\n" },
          ]);
        }
        docLines++;
        added.push(line);
        editDecorations.current = editor.deltaDecorations(
          editDecorations.current,
          added.map(addedLine),
        );
        editor.revealLineInCenterIfOutsideViewport(line);
        let column = 1;
        for (const chunk of o.text.match(/.{1,6}/g) || []) {
          if (!valid()) {
            aborted = true;
            break;
          }
          model.applyEdits([{ range: at(line, column), text: chunk }]);
          column += chunk.length;
          await sleep(chunk.length * perChar);
        }
        if (aborted) break;
        line++;
      }
    } finally {
      c.typing = false;
      if (codeRef.current === editor) editor.updateOptions({ readOnly: false });
    }
    if (aborted) return;
    if (model.getValue() !== after) {
      model.setValue(after);
      editDecorations.current = editor.deltaDecorations(
        editDecorations.current,
        lineDiff(before, after).added.map(addedLine),
      );
    }
    adoptCode(after);
    setActivity(reason || "");
    setTimeout(() => {
      if (codeRef.current === editor)
        editDecorations.current = editor.deltaDecorations(
          editDecorations.current,
          [],
        );
    }, 15000);
  }
  // The Testcase panel syncs to the server as it is edited (debounced) so the
  // interviewer always sees the candidate's current cases.
  function changeTests(list, target = state.current.index) {
    state.current.customTests = state.current.customTests.map((t, i) =>
      i === target ? list : t,
    );
    setCustomTests(state.current.customTests);
    pendingTests.current = { target, list };
    clearTimeout(testsTimer.current);
    testsTimer.current = setTimeout(() => void flushTests(), 400);
  }
  // Syncs are serialized so an older list can never overtake a newer one; a
  // rejected sync keeps its payload for the next attempt.
  async function flushTests() {
    const pending = pendingTests.current;
    if (!pending) {
      await testsChain.current.catch(() => {});
      return;
    }
    pendingTests.current = null;
    clearTimeout(testsTimer.current);
    const next = testsChain.current
      .catch(() => {})
      .then(() =>
        api(
          base + "/tests",
          { index: pending.target, tests: pending.list },
          "PUT",
        ),
      );
    testsChain.current = next;
    try {
      await next;
    } catch (e) {
      setError(e.message);
      pendingTests.current ??= pending;
    }
  }
  function save() {
    if (!initial.editors.length) return Promise.resolve();
    const target = state.current.index,
      value = state.current.code;
    const task = async () => {
      const current = state.current.editors[target];
      if (current.code === value) {
        setSaved("Saved");
        return;
      }
      setSaved("Saving…");
      try {
        const result = await api(
          base + "/editor",
          { index: target, code: value, revision: current.revision },
          "PUT",
        );
        state.current.editors = state.current.editors.map((e, i) =>
          i === target ? result : e,
        );
        setEditors(state.current.editors);
        if (state.current.code === value) setSaved("Saved");
      } catch (e) {
        setSaved("Save failed");
        if (e.status === 409) {
          state.current.editors[target] = e.data.editor;
          setPendingEdit(e.data.editor);
          throw new Error(
            "Alex edited this file. Apply the edit or keep yours.",
          );
        }
        throw e;
      }
    };
    const next = saveChain.current.catch(() => {}).then(task);
    saveChain.current = next;
    return next;
  }
  useEffect(() => {
    const timer = setTimeout(
      () => save().catch((e) => setError(e.message)),
      650,
    );
    return () => clearTimeout(timer);
  }, [code, index]);
  useEffect(() => {
    if (followCaptions.current)
      captions.current?.scrollTo({
        top: captions.current.scrollHeight,
        behavior: "smooth",
      });
  }, [transcript]);
  async function ask(request, delegationId = null) {
    if (state.current.ending) return;
    let followUp = null;
    const segment = state.current.segment;
    const reply = () =>
      state.current.segment === segment ? delegationId : null;
    if (state.current.busy) {
      if (delegationId)
        live.current?.send(
          "session.commentary.append",
          "A review is already in progress. Please wait for its result.",
          delegationId,
        );
      return;
    }
    state.current.busy = true;
    setBusy(true);
    setError("");
    try {
      await save();
      await flushTests();
      const target = state.current.index,
        snapshot = state.current.code;
      const result = await api(base + "/agent", {
        index: target,
        request,
        transcript: state.current.transcript,
        runResult: state.current.runResult,
        debugTrace: state.current.debugTrace,
        debuggerCases: initial.debuggerEnabled
          ? (debugSuiteRef.current?.cases || []).map((c) => c.name).slice(0, 60)
          : undefined,
      });
      if (result.editor) {
        state.current.editors = state.current.editors.map((e, i) =>
          i === target ? result.editor : e,
        );
        setEditors(state.current.editors);
      }
      let message = result.message;
      for (const stage of result.stages || (result.stage ? [result.stage] : []))
        applyStage(stage, result.design);
      let typed = null;
      if (result.edits.length) {
        if (state.current.index === target && state.current.code === snapshot) {
          typed = typeEdit(
            snapshot,
            result.editor.code,
            target,
            result.edits.map((e) => e.reason).join(" · "),
          );
        } else {
          setPendingEdit(result.editor);
          message +=
            " Your draft was kept; Alex's edit is available in the editor.";
        }
      }
      if (
        Number.isInteger(result.nextIndex) &&
        result.nextIndex !== state.current.index
      )
        await goTo(result.nextIndex, { announced: true });
      // Alex drives the visual debugger: trace a case now, then narrate it.
      if (result.traceCase && initial.debuggerEnabled && debuggerRef.current) {
        setBottomTab("debugger");
        const trace = await debuggerRef.current.trace(result.traceCase);
        followUp = trace
          ? `The trace of ${result.traceCase} you requested has finished; debugTrace holds it (${trace.steps.length} steps, ${trace.result.error ? "error: " + trace.result.error : trace.result.ok ? "passed" : "failed"}). Explain the two or three most important steps by number with their variable values, call show_steps with those step numbers, and end with a question for the candidate.`
          : `The case "${result.traceCase}" is not in the debugger's list; pick one of: ${(
              debugSuiteRef.current?.cases || []
            )
              .map((c) => c.name)
              .slice(0, 12)
              .join(", ")}.`;
      }
      // Alex's walkthrough: the reference approach's data, step by step,
      // without any source; the backend narrates it with show_steps.
      if (
        result.walkthrough &&
        initial.debuggerEnabled &&
        debuggerRef.current
      ) {
        setBottomTab("debugger");
        debuggerRef.current.load(result.walkthrough);
        live.current?.send(
          "session.thinking.append",
          `A step-by-step walkthrough of ${result.walkthrough.case?.name || "an example"} (${result.walkthrough.approach || "reference approach"}, ${result.walkthrough.steps?.length || 0} steps) is now on screen in the Debugger tab. The backend's reply narrates it.`,
        );
      }
      if (result.debuggerSteps?.length && debuggerRef.current) {
        setBottomTab("debugger");
        void (async () => {
          for (const step of result.debuggerSteps) {
            debuggerRef.current?.goTo(step);
            await new Promise((r) => setTimeout(r, 4500));
          }
        })();
      }

      if (live.current?.ready) {
        for (const chunk of message.match(/.{1,650}(?:\s|$)/gs) || [
          message.slice(0, 650),
        ])
          live.current.send("session.commentary.append", chunk, reply());
      }
      if (typed) await typed;
      if (
        result.runCode &&
        state.current.index === target &&
        state.current.code === result.editor.code
      ) {
        await execute(state.current.code, result.runTarget || "submit");
      }
      return message;
    } catch (e) {
      setError(e.message);
      if (delegationId)
        live.current?.send(
          "session.commentary.append",
          "The backend could not finish this request. Ask the candidate to check the workspace error and retry.",
          reply(),
        );
    } finally {
      state.current.busy = false;
      setBusy(false);
    }
    if (followUp) return ask(followUp, delegationId);
  }
  // Git-style marking of the lines an interviewer edit added; fades after a while.
  function highlightEdit(before, after) {
    const editor = codeRef.current;
    if (!editor) return;
    const { added } = lineDiff(before, after);
    setTimeout(() => {
      editDecorations.current = editor.deltaDecorations(
        editDecorations.current,
        added.map((line) => ({
          range: {
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: "agent-added",
            linesDecorationsClassName: "agent-added-gutter",
          },
        })),
      );
      if (added.length) editor.revealLineInCenterIfOutsideViewport(added[0]);
    }, 60);
    setTimeout(() => {
      editDecorations.current = editor.deltaDecorations(
        editDecorations.current,
        [],
      );
    }, 15000);
  }
  function applyStage(stage, nextDesign) {
    if (!stage) return;
    setStages((list) => [...list, stage]);
    if (nextDesign) setDesign(nextDesign);
    state.current.lastCheckInAt = Date.now();
    live.current?.send(
      isQuiet() ? "session.thinking.append" : "session.commentary.append",
      `New constraint: ${stage.title}. ${stage.constraint} How does that change your design?`,
    );
  }
  async function advanceStage(reason = "candidate") {
    if (stageBusy || !design || design.nextAt === null) return;
    if (initial.problems[0].id === "custom") {
      // No script for a custom brief: the backend invents and announces one.
      // One attempt per stage from the timer; the button can always retry.
      if (
        reason === "timer" &&
        state.current.customAttempt === design.stageIndex
      )
        return;
      state.current.customAttempt = design.stageIndex;
      state.current.lastCheckInAt = Date.now();
      setStageBusy(true);
      try {
        await ask(
          "Reveal the next design constraint now: invent one that fits this brief and stresses the current design, then introduce it and ask how the design changes.",
        );
      } finally {
        setStageBusy(false);
      }
      return;
    }
    setStageBusy(true);
    try {
      const result = await api(base + "/stage", {});
      if (result.stage) applyStage(result.stage, result.design);
      else setDesign(result.design);
      if (reason === "candidate" && result.stage)
        live.current?.send(
          "session.commentary.append",
          "The candidate says this step is finished.",
        );
    } catch (e) {
      setError(e.message);
    } finally {
      setStageBusy(false);
    }
  }
  async function submitAnswer(answer) {
    const target = state.current.index;
    setAnswering(true);
    setError("");
    try {
      await save();
      const result = await api(base + "/answer", { index: target, answer });
      setAttempts((list) =>
        list.map((a, i) => (i === target ? result.attempts : a)),
      );
      if (result.answer !== undefined)
        setSolutions((all) => ({
          ...all,
          [target]: { answer: result.answer, solution: result.solution },
        }));
      state.current.lastCheckInAt = Date.now();
      live.current?.send(
        isQuiet() ? "session.thinking.append" : "session.commentary.append",
        result.correct
          ? `${answer} is correct. Walk me through the key step.`
          : `${answer} isn't it. Which assumption might be off?`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setAnswering(false);
    }
  }
  async function revealAnswer() {
    const target = state.current.index;
    setAnswering(true);
    try {
      const result = await api(base + "/reveal", { index: target });
      setAttempts((list) =>
        list.map((a, i) => (i === target ? result.attempts : a)),
      );
      setSolutions((all) => ({
        ...all,
        [target]: { answer: result.answer, solution: result.solution },
      }));
      live.current?.send(
        "session.thinking.append",
        result.answer
          ? `The candidate revealed the reference answer for question ${target + 1}: ${result.answer}. Walk through the key idea with them briefly.`
          : `The candidate revealed the reference solution for question ${target + 1}. Walk through its key idea with them briefly.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setAnswering(false);
    }
  }
  // Compact trace summary the reasoning backend receives with the next request.
  function onDebugTrace({ case: testCase, steps, result }) {
    const brief = (v) =>
      JSON.stringify(v.v ?? (v.t === "node" ? "node#" + v.id : v.t));
    const line = (s, i) =>
      `#${i + 1} L${s.line}: ` +
      Object.entries(s.vars)
        .filter(([, v]) => v.t !== "fn")
        .map(([k, v]) => `${k}=${brief(v)}`.slice(0, 60))
        .join(" ") +
      (s.ret ? ` → returns ${brief(s.ret)}` : "");
    const picked =
      steps.length <= 50
        ? steps.map(line)
        : [
            ...steps.slice(0, 40).map(line),
            `… ${steps.length - 50} steps omitted …`,
            ...steps.slice(-10).map((s, i) => line(s, steps.length - 10 + i)),
          ];
    const last = picked.join("\n");
    const outcome = result.error
      ? "error: " + result.error
      : result.ok
        ? "passed"
        : "failed";
    const headline = `Visual debugger on case "${testCase?.name}": ${steps.length} steps, ${outcome}.`;
    state.current.debugTrace =
      `${headline}\nSteps (#step Lline: variables):\n${last}`.slice(0, 6000);
    live.current?.send(
      "session.thinking.append",
      headline + " The backend has the full trace.",
    );
  }
  function onLiveEvent(e) {
    if (
      e.type === "session.started" &&
      boards.current[state.current.index]?.summary
    ) {
      live.current?.send(
        "session.thinking.append",
        "Current whiteboard: " +
          boards.current[state.current.index].summary.slice(0, 900),
      );
    }
    if (
      [
        "session.input_transcript.delta",
        "session.output_transcript.delta",
      ].includes(e.type)
    ) {
      if (e.event_id && state.current.seenEvents.has(e.event_id)) return;
      if (e.event_id) state.current.seenEvents.add(e.event_id);
      if (e.type.includes("input")) {
        state.current.lastSpeechAt = Date.now();
        state.current.checkIns = 0;
        heardUser(e.delta || "");
      }
      const row = {
        id: e.event_id,
        segment: state.current.segment,
        role: e.type.includes("input") ? "user" : "assistant",
        text: e.delta,
        start_ms: e.start_ms,
        end_ms: e.end_ms,
      };
      state.current.transcript.push(row);
      setTranscript((t) => [...t, row]);
      clearTimeout(state.current.transcriptTimer);
      state.current.transcriptTimer = setTimeout(
        () =>
          api(
            base + "/transcript",
            { transcript: state.current.transcript },
            "PUT",
          ).catch(() => {}),
        2000,
      );
    }
    if (
      e.type === "session.delegation.created" &&
      e.delegation.target === "client"
    )
      void ask(
        "Respond to the latest spoken request using the conversation and available interview context.",
        e.delegation.id,
      );
  }
  function connect() {
    setError("");
    setMuted(false);
    const reconnecting =
      state.current.segment > 0 || state.current.transcript.length > 0;
    state.current.segment++;
    const connection = new LiveConnection({
      greeting: reconnecting
        ? "Voice has reconnected mid-interview. Say in one sentence that you are back, then continue from where the conversation and the work on screen left off; do not restart the introduction."
        : {
            behavioral:
              "Greet the candidate immediately, introduce yourself as their AI behavioral interviewer, and ask one introductory question grounded in their resume. Follow the configured style. Do not ask them to code. Then listen.",
            probability:
              "Greet the candidate immediately, introduce yourself as their AI probability interviewer, and ask them to read the question on screen and describe how they would set it up. Do not state the answer. Then listen.",
            design:
              "Greet the candidate immediately, introduce yourself as their AI system design interviewer, present the brief in one or two sentences, and ask them to start by clarifying requirements and estimating scale. Then listen.",
          }[mode],
      onStatus: setVoice,
      onEvent: onLiveEvent,
      onError: setError,
    });
    live.current = connection;
    void connection.connect(base + "/live");
  }
  // run = the Testcase panel (like LeetCode Run); submit = the prepared suite
  // (like LeetCode Submit); scratchpad = execute the file as-is.
  async function execute(value = state.current.code, requested = "run") {
    const target = state.current.index;
    const problemAt = initial.problems[target];
    const spec = problemAt.testSpec;
    const { mode, fallback } = resolveRunMode(requested, {
      hasSuite: !!problemAt.testSuite,
      hasSpec: !!spec,
    });
    let suite = null;
    if (mode === "submit") suite = problemAt.testSuite;
    else if (mode === "run") {
      const built = buildCustomSuite(spec, state.current.customTests[target]);
      if (built.invalid.length || !built.suite.cases.length) {
        const reason = built.invalid.length
          ? "invalid testcases: " +
            built.invalid
              .map((p) => `Case ${p.index + 1}: ${p.error}`)
              .join("; ")
          : "the Testcase panel is empty";
        setOutput(
          built.invalid.length
            ? { kind: "invalid", errors: built.invalid }
            : { kind: "empty" },
        );
        setBottomTab("result");
        state.current.runResult = `candidate testcases: not run, ${reason}`;
        live.current?.send(
          "session.thinking.append",
          `The candidate's testcases could not run: ${reason}.`,
        );
        return null;
      }
      suite = built.suite;
    }
    if (state.current.runInFlight) return null;
    state.current.runInFlight = true;
    setRunning(mode);
    setBottomTab("result");
    const raw = await runCode(value, initial.language, suite);
    const result = {
      ...raw,
      kind: mode,
      fallback,
      runId: Date.now(),
      casesSnapshot: JSON.stringify(state.current.customTests[target]),
    };
    const label =
      mode === "submit"
        ? "prepared suite"
        : mode === "run"
          ? "candidate testcases"
          : "scratchpad";
    if (state.current.index === target) {
      setOutput(result);
      state.current.runResult = `${label}: ${result.output}`;
    }
    state.current.runs[target] = [
      ...(state.current.runs[target] || []),
      { code: value, mode, ...raw },
    ];
    state.current.runInFlight = false;
    setRunning(null);
    void api(base + "/runs", {
      index: target,
      run: {
        code: value,
        mode,
        ok: raw.ok,
        passed: raw.passed,
        total: raw.total,
        output: raw.output,
      },
    }).catch(() => {});
    live.current?.send(
      "session.thinking.append",
      `The browser ran problem ${target + 1} (${problemAt.title}), ${label}. Result: ${result.output.slice(0, 650)}`,
    );
    state.current.lastCheckInAt = Date.now();
    live.current?.send(
      isQuiet() ? "session.thinking.append" : "session.commentary.append",
      spokenResult(result),
    );
    return result;
  }
  async function next() {
    if (state.current.busy) return;
    await goTo(state.current.index + 1);
  }
  // Switches problems; used by the Next button and by the backend's next_problem tool.
  async function goTo(nextIndex, { announced = false } = {}) {
    if (!initial.problems[nextIndex] || nextIndex === state.current.index)
      return;
    try {
      await save();
      await flushTests();
      await boards.current[state.current.index]?.flush?.().catch(() => {});
      if (!announced) await api(base + "/current", { index: nextIndex });
      const c = state.current;
      c.timeSpent[c.index] =
        (c.timeSpent[c.index] || 0) + (Date.now() - c.problemStartedAt);
      c.problemStartedAt = Date.now();
      state.current.index = nextIndex;
      state.current.code = state.current.editors[nextIndex].code;
      setIndex(nextIndex);
      setCode(state.current.code);
      setOutput(null);
      state.current.runResult = "";
      state.current.debugTrace = "";
      setPendingEdit(null);
      state.current.lastCheckInAt = Date.now();
      live.current?.send(
        isQuiet() ? "session.thinking.append" : "session.commentary.append",
        `${isProbability ? "Question" : "Problem"} ${nextIndex + 1}: ${initial.problems[nextIndex].title}. Take a moment to read it, then tell me your first thoughts.`,
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function finish() {
    if (state.current.busy || state.current.ending) return;
    state.current.ending = true;
    setEnding(true);
    setError("");
    try {
      await save();
      await flushTests();
      await boards.current[state.current.index]?.flush?.().catch(() => {});
      await live.current?.close();
      const c = state.current;
      c.timeSpent[c.index] =
        (c.timeSpent[c.index] || 0) + (Date.now() - c.problemStartedAt);
      c.problemStartedAt = Date.now();
      const result = await api(base + "/feedback", {
        transcript: c.transcript,
        runs: c.runs,
        timing: Object.fromEntries(
          Object.entries(c.timeSpent).map(([i, ms]) => [
            i,
            Math.round(ms / 1000),
          ]),
        ),
        hints,
      });
      setFeedback(result);
    } catch (e) {
      setError(e.message);
    } finally {
      state.current.ending = false;
      setEnding(false);
    }
  }
  // Debugger cases: the prepared suite first (indexes match Submit results),
  // then the candidate's own cases that carry an expected value.
  const debugSuite = useMemo(() => {
    if (!hasCode || !initial.debuggerEnabled) return null;
    const prepared = problem.testSuite;
    const own = problem.testSpec
      ? buildCustomSuite(problem.testSpec, customTests[index] || [])
          .suite.cases.filter((c) => "expected" in c)
          .map((c) => ({ ...c, own: true, name: `Your ${c.name}` }))
      : [];
    if (!prepared && !own.length) return null;
    return {
      ...(prepared || problem.testSpec),
      cases: [...(prepared?.cases || []), ...own],
    };
  }, [problem, customTests, index, hasCode, initial.debuggerEnabled]);
  debugSuiteRef.current = debugSuite;
  // Drag the bar above the bottom tabs to resize the panel; double-click resets.
  function startResize(e) {
    const startY = e.clientY;
    const startH = panelHeight;
    const move = (ev) =>
      setPanelHeight(
        Math.max(
          120,
          Math.min(window.innerHeight * 0.7, startH - (ev.clientY - startY)),
        ),
      );
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            mode: initial.mode,
            resume: initial.resume,
            whiteboards: boards.current,
            problems: initial.problems.map((p) => p.title),
            language: initial.language,
            editors: state.current.editors,
            testcases: state.current.customTests,
            attempts,
            stages,
            transcript: state.current.transcript,
            feedback,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pairwise-interview.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const starterCode = hasCode
    ? problem.codeSnippets?.find((c) => c.langSlug === initial.language)
        ?.code ||
      (initial.language === "javascript"
        ? "// Write your solution here\n"
        : "# Write your solution here\n")
    : "";
  const budget = hasCode || isProbability ? budgetSeconds(problem) : 0;
  const clockSeconds =
    isDesign && design
      ? Math.max(0, Math.round(design.durationMs / 1000) - elapsed)
      : budget
        ? problemElapsed
        : elapsed;
  const mmss = (sec) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const voiceLabel =
    {
      offline: "Voice off",
      connecting: "Connecting…",
      live: quiet ? "On hold" : "Listening",
      closing: "Stopping…",
      ended: "Voice ended",
      disconnected: "Disconnected",
    }[voice] || voice;
  return (
    <div className="workspace">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark">
            <Braces size={23} />
          </span>
          pairwise
        </span>
        <div className="room-label">
          {isBehavioral ? (
            "Behavioral"
          ) : isDesign ? (
            "System design"
          ) : initial.problems.length > 1 ? (
            <select
              className="problem-jump"
              aria-label="Jump to problem"
              value={index}
              disabled={busy || ending}
              onChange={(e) => void goTo(Number(e.target.value))}
            >
              {initial.problems.map((p, i) => (
                <option key={i} value={i}>
                  {isProbability ? "Question" : "Problem"} {i + 1} of{" "}
                  {initial.problems.length} · {p.title}
                </option>
              ))}
            </select>
          ) : (
            `${isProbability ? "Question" : "Problem"} 1 of 1`
          )}
        </div>
        <div className="room-actions">
          <span
            className={
              "clock " + (budget && problemElapsed >= budget ? "over" : "")
            }
            title={
              isDesign
                ? "Time remaining"
                : budget
                  ? "Time on this problem · suggested budget"
                  : "Elapsed"
            }
          >
            <Timer size={15} />
            {mmss(clockSeconds)}
            {budget ? <small> / {mmss(budget)}</small> : null}
          </span>
          <button
            className="quiet"
            disabled={busy || running || ending || !!feedback}
            onClick={finish}
          >
            {ending ? "Grading…" : "Finish"}
          </button>
        </div>
      </header>
      <div className="room-body">
        {isBehavioral ? (
          <ResumePane
            resume={initial.resume}
            targetRole={initial.targetRole}
            focus={initial.focus}
          />
        ) : isProbability ? (
          <ProbabilityPane
            problem={problem}
            index={index}
            total={initial.problems.length}
            attempts={attempts[index] || []}
            solution={solutions[index]}
            busy={answering || busy}
            onSubmit={submitAnswer}
            onReveal={revealAnswer}
            hints={hints[index] || 0}
            onHint={() => {
              setHints((h) => ({ ...h, [index]: (h[index] || 0) + 1 }));
              state.current.lastCheckInAt = Date.now();
              void ask(
                "The candidate pressed Hint. Give the next smallest hint for this question in one or two sentences, building on any hint already given; do not reveal the answer.",
              );
            }}
            onNext={next}
          />
        ) : isDesign ? (
          <DesignPane
            problem={problem}
            design={design}
            stages={stages}
            elapsedMs={elapsed * 1000}
            busy={stageBusy}
            onAdvance={() => advanceStage("candidate")}
          />
        ) : (
          <section className="statement-pane">
            <div className="statement-scroll">
              <h1>{problem.title}</h1>
              <div className="problem-meta">
                <span className={"difficulty " + problem.difficulty}>
                  {problem.difficulty}
                </span>
                {problem.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <article
                className="statement"
                dangerouslySetInnerHTML={{ __html: problem.content }}
              />
            </div>
            <div className="problem-bottom">
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://leetcode.com/problems/${problem.slug}/`}
              >
                Source
                <ArrowUpRight size={14} />
              </a>
              {index < initial.problems.length - 1 && (
                <button className="quiet" onClick={next} disabled={busy}>
                  Next problem
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </section>
        )}
        <div className="work-surface">
          <div className="surface-tabs">
            {hasCode && (
              <button
                className={workspaceTab === "code" ? "active" : ""}
                onClick={() => setWorkspaceTab("code")}
              >
                <Code2 size={14} />
                Code
              </button>
            )}
            {usesNotes && (
              <button
                className={workspaceTab === "notes" ? "active" : ""}
                onClick={() => setWorkspaceTab("notes")}
              >
                <NotebookPen size={14} />
                Notes
              </button>
            )}
            <button
              className={workspaceTab === "canvas" ? "active" : ""}
              onClick={() => setWorkspaceTab("canvas")}
            >
              <PenTool size={14} />
              Whiteboard
            </button>
            <div className="surface-actions">
              {(hasCode || usesNotes) && workspaceTab !== "canvas" && (
                <span
                  className={
                    "save-state " + (saved === "Save failed" ? "bad" : "")
                  }
                >
                  {saved}
                </span>
              )}
              {hasCode && (
                <>
                  <span className="file-name">
                    {initial.language === "python3" ? "Python 3" : "JavaScript"}
                  </span>
                  {resetArmed ? (
                    <span className="reset-confirm">
                      Reset code?
                      <button
                        className="quiet"
                        onClick={() => {
                          changeCode(starterCode);
                          setResetArmed(false);
                        }}
                      >
                        Reset
                      </button>
                      <button
                        className="quiet"
                        onClick={() => setResetArmed(false)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      className="quiet reset"
                      title="Reset to the starter code"
                      aria-label="Reset to the starter code"
                      disabled={code === starterCode}
                      onClick={() => setResetArmed(true)}
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                  <button
                    className="run"
                    disabled={!!running}
                    title="Run (Ctrl+')"
                    onClick={() => execute(state.current.code, "run")}
                  >
                    {running === "run" ? (
                      <Loader2 className="spin" size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                    Run
                  </button>
                  <button
                    className="run submit"
                    disabled={!!running}
                    title={
                      problem.testSuite
                        ? `Submit (Ctrl+Enter) · ${problem.testCount} hidden tests`
                        : "Submit (Ctrl+Enter) · no hidden tests, runs your testcases"
                    }
                    onClick={() => execute(state.current.code, "submit")}
                  >
                    {running === "submit" ? (
                      <Loader2 className="spin" size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    Submit
                  </button>
                </>
              )}
            </div>
          </div>
          {usesNotes && (
            <div
              className="notes-surface"
              style={{ display: workspaceTab === "notes" ? "flex" : "none" }}
            >
              <NotesEditor
                value={code}
                onChange={changeCode}
                label={isDesign ? "design-notes.md" : "scratch-work.md"}
                placeholder="Notes"
              />
            </div>
          )}
          {hasCode && (
            <section
              className="editor-pane"
              style={{ display: workspaceTab === "code" ? "flex" : "none" }}
            >
              <div className="monaco">
                <Editor
                  language={
                    initial.language === "python3" ? "python" : "javascript"
                  }
                  theme="vs-dark"
                  value={code}
                  onChange={changeCode}
                  onMount={(editor) => {
                    codeRef.current = editor;
                    setEditorInstance(editor);
                    editor.addCommand(
                      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote,
                      () => execute(state.current.code, "run"),
                    );
                    editor.addCommand(
                      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                      () => execute(state.current.code, "submit"),
                    );
                  }}
                  options={{
                    fontSize: 14,
                    fontFamily: '"SFMono-Regular", Consolas, monospace',
                    minimap: { enabled: false },
                    padding: { top: 24 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbersMinChars: 3,
                    wordWrap: "on",
                    tabSize: 4,
                  }}
                />
              </div>
              {pendingEdit && (
                <div className="edit-conflict">
                  Alex edited this file.
                  <button onClick={() => setShowDiff(true)}>
                    <GitCompare size={13} />
                    Diff
                  </button>
                  <button
                    onClick={() => {
                      void typeEdit(
                        state.current.code,
                        pendingEdit.code,
                        state.current.index,
                        "Alex's edit",
                      );
                      setPendingEdit(null);
                      setShowDiff(false);
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setPendingEdit(null);
                      save().catch((e) => setError(e.message));
                    }}
                  >
                    Keep mine
                  </button>
                </div>
              )}
              <div
                className="panel-handle"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize panel"
                onPointerDown={startResize}
                onDoubleClick={() => setPanelHeight(300)}
              />
              <div className="bottom-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={bottomTab === "testcase"}
                  className={bottomTab === "testcase" ? "active" : ""}
                  onClick={() => setBottomTab("testcase")}
                >
                  <Check size={12} /> Testcase
                </button>
                <button
                  role="tab"
                  aria-selected={bottomTab === "result"}
                  className={bottomTab === "result" ? "active" : ""}
                  onClick={() => setBottomTab("result")}
                >
                  <Terminal size={12} /> Test Result
                  {output && !running && (
                    <i
                      className={"tab-dot " + (verdict(output)?.tone || "")}
                      role="img"
                      aria-label={verdict(output)?.label}
                    />
                  )}
                </button>
                {initial.debuggerEnabled && (
                  <button
                    role="tab"
                    aria-selected={bottomTab === "debugger"}
                    className={bottomTab === "debugger" ? "active" : ""}
                    onClick={() => setBottomTab("debugger")}
                  >
                    <Bug size={12} /> Debugger
                  </button>
                )}
              </div>
              <div className="bottom-panel" style={{ height: panelHeight }}>
                <div className="bottom-slot" hidden={bottomTab !== "testcase"}>
                  <Testcases
                    key={index}
                    spec={problem.testSpec}
                    cases={customTests[index] || []}
                    onChange={(list) => changeTests(list)}
                  />
                </div>
                <div className="bottom-slot" hidden={bottomTab !== "result"}>
                  <TestResult
                    spec={problem.testSpec}
                    cases={customTests[index] || []}
                    result={output}
                    running={!!running}
                  />
                </div>
                {initial.debuggerEnabled && (
                  <div
                    className="bottom-slot"
                    hidden={bottomTab !== "debugger"}
                  >
                    <Debugger
                      ref={debuggerRef}
                      key={index}
                      suite={debugSuite}
                      language={initial.language}
                      code={code}
                      editor={editorInstance}
                      lastRun={output?.kind === "submit" ? output : null}
                      onTrace={onDebugTrace}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
          <div
            className="board-surface"
            style={{ display: workspaceTab === "canvas" ? "flex" : "none" }}
          >
            <Whiteboard
              key={index}
              base={base}
              index={index}
              store={(boards.current[index] ??= { strokes: [], revision: 0 })}
              disabled={ending || !!feedback}
              onActivity={() => {
                state.current.lastActivityAt = Date.now();
              }}
              onContext={(summary, boardIndex) => {
                if (state.current.index === boardIndex && !state.current.ending)
                  live.current?.send(
                    "session.thinking.append",
                    `Current whiteboard: ${summary.slice(0, 900)}`,
                  );
              }}
            />
          </div>
        </div>
        <aside className="interviewer-pane">
          <div className="agent-row">
            <span className={"live-dot " + (voice === "live" ? "on" : "")} />
            <strong>Alex</strong>
            <span className="agent-state">{voiceLabel}</span>
            <div className="voice-controls">
              {["offline", "ended", "disconnected"].includes(voice) ? (
                <button className="primary" onClick={connect}>
                  <Headphones size={14} />
                  {voice === "offline" ? "Connect voice" : "Reconnect voice"}
                </button>
              ) : (
                <>
                  <button
                    className={muted ? "muted-button" : ""}
                    disabled={voice !== "live"}
                    aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                    onClick={() => {
                      live.current?.mute(!muted);
                      setMuted(!muted);
                    }}
                  >
                    {muted ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                  <button
                    aria-label="Play audio"
                    onClick={() =>
                      live.current?.audio
                        ?.play()
                        .catch((e) => setError(e.message))
                    }
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    aria-label="Stop voice"
                    onClick={() => live.current?.close()}
                  >
                    <Square size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="transcript-label">
            <span>Transcript</span>
            <span>{busy ? "Thinking…" : ""}</span>
          </div>
          <div
            className="conversation"
            ref={captions}
            onScroll={(e) => {
              const el = e.currentTarget;
              followCaptions.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 70;
            }}
          >
            {!transcript.length && (
              <div className="conversation-empty">
                <p>
                  {voice === "live"
                    ? "Listening…"
                    : voice === "connecting"
                      ? "Connecting…"
                      : ""}
                </p>
              </div>
            )}
            {captionRows.map((row) => (
              <div key={row.key} className={"caption-turn " + row.role}>
                <div className="caption-speaker">
                  <span>{row.role === "user" ? "You" : "Alex"}</span>
                  <time>
                    {Math.floor(row.start_ms / 60000)}:
                    {String(Math.floor(row.start_ms / 1000) % 60).padStart(
                      2,
                      "0",
                    )}
                  </time>
                </div>
                <p>{row.text.trim()}</p>
              </div>
            ))}
          </div>
          {activity && (
            <div className="editor-activity" role="status">
              <Code2 size={14} />
              <span>{activity}</span>
            </div>
          )}
        </aside>
      </div>
      {error && (
        <div className="error room-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {showDiff && pendingEdit && (
        <div className="modal-backdrop" onClick={() => setShowDiff(false)}>
          <section
            className="card diff-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-title">
              <div>
                <h2>Alex's edit</h2>
              </div>
              <button
                aria-label="Close diff"
                className="quiet"
                onClick={() => setShowDiff(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="diff-editor">
              <DiffEditor
                original={code}
                modified={pendingEdit.code}
                language={
                  initial.language === "python3" ? "python" : "javascript"
                }
                theme="vs-dark"
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                }}
              />
            </div>
            <div className="feedback-actions">
              <button
                className="quiet"
                onClick={() => {
                  setPendingEdit(null);
                  setShowDiff(false);
                  save().catch((e) => setError(e.message));
                }}
              >
                Keep mine
              </button>
              <button
                className="primary"
                onClick={() => {
                  void typeEdit(
                    state.current.code,
                    pendingEdit.code,
                    state.current.index,
                    "Alex's edit",
                  );
                  setPendingEdit(null);
                  setShowDiff(false);
                }}
              >
                Apply
              </button>
            </div>
          </section>
        </div>
      )}
      {feedback && (
        <div className="modal-backdrop">
          <section className="feedback card">
            <h2>Feedback</h2>
            <p className="feedback-summary">{feedback.summary}</p>
            <div className="rubric-legend">
              1 Needs work · 2 Developing · 3 Competent · 4 Strong · 5 Excellent
            </div>
            <section className="rubric-grid">
              {gradingRubric.map((item) => {
                const grade = feedback.criteria[item.id];
                return (
                  <article className="rubric-card" key={item.id}>
                    <div className="rubric-heading">
                      <h3>{item.label}</h3>
                      <span className="rubric-score">
                        {grade.score === null ? (
                          "Not assessed"
                        ) : (
                          <>
                            <strong>{grade.score}</strong>
                            <span>/ 5</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="rubric-rating">
                      {grade.score === null
                        ? "Insufficient evidence"
                        : scoreLabels[grade.score]}
                    </div>
                    <p className="rubric-description">{item.description}</p>
                    <p>{grade.evidence}</p>
                    <div className="rubric-improvement">
                      <strong>Next step</strong>
                      <p>{grade.improvement}</p>
                    </div>
                  </article>
                );
              })}
            </section>
            <div className="feedback-lists">
              <section>
                <h3>Strengths</h3>
                <ul>
                  {feedback.strengths.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Next steps</h3>
                <ol>
                  {feedback.next_steps.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ol>
              </section>
            </div>
            {captionRows.length > 0 && (
              <details className="feedback-transcript">
                <summary>Transcript · {captionRows.length} turns</summary>
                <div className="feedback-turns">
                  {captionRows.map((row) => (
                    <div key={row.key} className={"caption-turn " + row.role}>
                      <div className="caption-speaker">
                        <span>{row.role === "user" ? "You" : "Alex"}</span>
                        <time>
                          {Math.floor(row.start_ms / 60000)}:
                          {String(
                            Math.floor(row.start_ms / 1000) % 60,
                          ).padStart(2, "0")}
                        </time>
                      </div>
                      <p>{row.text.trim()}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <div className="feedback-actions">
              <button className="quiet" onClick={download}>
                <Download size={16} />
                Export
              </button>
              <button
                className="primary"
                disabled={voice === "closing"}
                onClick={onExit}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <AccountProvider>
    <App />
  </AccountProvider>,
);
