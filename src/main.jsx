import React, { useEffect, useRef, useState } from "react";
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
  SlidersHorizontal,
  RotateCcw,
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
import { lineDiff } from "./diff.mjs";
import { DiffEditor } from "@monaco-editor/react";
import { Bug, GitCompare } from "lucide-react";
import { AccountProvider, useAccount, SignInGate } from "./account.jsx";
import { Profile } from "./profile.jsx";
import { KeyNotice } from "./pages.jsx";
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
  async function start() {
    setLoading(true);
    setError("");
    try {
      onStart(
        await api("/api/interviews", {
          ...filters,
          count,
          language,
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
  return (
    <div className="app-shell">
      <main className="setup coding-setup">
        <div className="page-heading">
          <span className="eyebrow muted">CODING PRACTICE</span>
          <h1>Find your next challenge.</h1>
          <p>Choose your focus. The coding room stays yours.</p>
        </div>
        <div className="setup-grid">
          <section className="config card">
            <div className="section-title">
              <div>
                <span className="eyebrow muted">MAKE IT YOURS</span>
                <h2>Set up your interview</h2>
              </div>
              <SlidersHorizontal size={20} />
            </div>
            <label className="field-label">
              Target companies <span>Optional · choose any</span>
            </label>
            <div className="chips">
              {[
                "Google",
                "Amazon",
                "Meta",
                "Microsoft",
                "Apple",
                "Bloomberg",
              ].map((c) => (
                <button
                  key={c}
                  className={
                    "chip " + (filters.companies.includes(c) ? "selected" : "")
                  }
                  onClick={() => toggle("companies", c)}
                >
                  {filters.companies.includes(c) && <Check size={13} />} {c}
                </button>
              ))}
            </div>
            <select
              aria-label="Add company"
              value=""
              onChange={(e) => {
                if (e.target.value) toggle("companies", e.target.value);
              }}
            >
              <option value="">Search all {companies.length} companies…</option>
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="chips small">
              {filters.companies
                .filter(
                  (c) =>
                    ![
                      "Google",
                      "Amazon",
                      "Meta",
                      "Microsoft",
                      "Apple",
                      "Bloomberg",
                    ].includes(c),
                )
                .map((c) => (
                  <button
                    className="chip selected"
                    key={c}
                    onClick={() => toggle("companies", c)}
                  >
                    {c}
                    <X size={12} />
                  </button>
                ))}
            </div>
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
            <label className="field-label">
              Topics <span>Optional · choose any</span>
            </label>
            <div className="chips">
              {[
                "Array",
                "String",
                "Hash Table",
                "Dynamic Programming",
                "Tree",
                "Graph",
              ].map((t) => (
                <button
                  key={t}
                  className={
                    "chip " + (filters.topics.includes(t) ? "selected" : "")
                  }
                  onClick={() => toggle("topics", t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              aria-label="Add topic"
              value=""
              onChange={(e) => {
                if (e.target.value) toggle("topics", e.target.value);
              }}
            >
              <option value="">Browse all topics…</option>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div className="chips small">
              {filters.topics
                .filter(
                  (t) =>
                    ![
                      "Array",
                      "String",
                      "Hash Table",
                      "Dynamic Programming",
                      "Tree",
                      "Graph",
                    ].includes(t),
                )
                .map((t) => (
                  <button
                    className="chip selected"
                    key={t}
                    onClick={() => toggle("topics", t)}
                  >
                    {t}
                    <X size={12} />
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
                Problems with prepared tests only{" "}
                <small>
                  {catalog.filter((p) => p.testCount > 0).length} available
                </small>
              </span>
            </label>
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
            <div className="interviewer-config">
              <label className="field-label">
                Interviewer style <span>Choose a starting point</span>
              </label>
              <div className="preset-grid">
                {interviewerPresets.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={style === p.id ? "preset selected" : "preset"}
                    onClick={() => {
                      setStyle(p.id);
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
                <label htmlFor="interviewer-prompt">
                  Instructions for this interview
                </label>
                <textarea
                  id="interviewer-prompt"
                  maxLength={6000}
                  rows={7}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div>
                  <span>
                    {prompt.length.toLocaleString()} / 6,000 characters
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt(
                        interviewerPresets.find((p) => p.id === style).prompt,
                      )
                    }
                  >
                    Reset to preset
                  </button>
                </div>
                <p>
                  Your instructions guide both the voice interviewer and
                  code-review backend. The feedback rubric stays consistent
                  across styles.
                </p>
              </details>
            </div>
            <div className="start-area">
              <div className="match-count">
                <span className="live-dot" />
                {ready
                  ? `${matching.length.toLocaleString()} matching public problems`
                  : "Loading your problem library…"}
              </div>
              <button
                className="primary start"
                onClick={start}
                disabled={
                  loading ||
                  matching.length < count ||
                  !prompt.trim() ||
                  !hasKey
                }
              >
                {loading ? "Preparing your interview…" : "Enter interview room"}
                <ArrowRight size={18} />
              </button>
              <p>
                Your microphone connects on entry. Alex will greet you when the
                room is ready.
              </p>
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
              <div className="library-title">
                <div>
                  <span className="eyebrow muted">YOUR PROBLEM LIBRARY</span>
                  <h3>{catalog.length.toLocaleString()} ways to get better.</h3>
                </div>
                <span className="tiny-tag">LEETCODE</span>
              </div>
              <div className="search">
                <Search size={16} />
                <input
                  aria-label="Search problem library"
                  placeholder="Find a problem by name or number"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
              <div className="problem-list">
                {matching.slice(0, 4).map((p) => (
                  <div className="problem-row" key={p.id}>
                    <span className="problem-id">
                      {String(p.id).padStart(3, "0")}
                    </span>
                    <span>{p.title}</span>
                    <span className={"difficulty " + p.difficulty}>
                      {p.difficulty}
                    </span>
                  </div>
                ))}
                {ready && !matching.length && (
                  <p className="muted">No matches. Try fewer filters.</p>
                )}
              </div>
              <p className="library-foot">
                Imported from your local collection · Statements load on demand
              </p>
            </section>
          </aside>
        </div>
        <footer>
          Built for the moments before the real thing.
          <span>
            <span className="live-dot" /> Take your time. You’ve got this.
          </span>
        </footer>
      </main>
    </div>
  );
}
function App() {
  const { user, loading } = useAccount();
  const [path, setPath] = useState(window.location.pathname),
    [session, setSession] = useState(null);
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
  if (session)
    return <Workspace session={session} onExit={() => setSession(null)} />;
  const gated = ["/coding", "/behavioral", "/profile"].includes(path);
  return (
    <div className="app-shell">
      <SiteHeader path={path} navigate={navigate} />
      {gated && loading ? (
        <main className="setup">
          <p className="muted">Checking your account…</p>
        </main>
      ) : gated && !user ? (
        <SignInGate />
      ) : path === "/coding" ? (
        <CodingSetup onStart={setSession} navigate={navigate} />
      ) : path === "/behavioral" ? (
        <BehavioralSetup onStart={setSession} navigate={navigate} />
      ) : path === "/profile" ? (
        <Profile navigate={navigate} />
      ) : (
        <Home navigate={navigate} />
      )}
    </div>
  );
}
function Workspace({ session: initial, onExit }) {
  const isBehavioral = initial.mode === "behavioral";
  const gradingRubric = isBehavioral ? behavioralRubric : rubric;
  const [workspaceTab, setWorkspaceTab] = useState(
    isBehavioral ? "canvas" : "code",
  );
  const boards = useRef({});
  const [index, setIndex] = useState(0),
    [editors, setEditors] = useState(initial.editors),
    [code, setCode] = useState(initial.editors[0]?.code || ""),
    [voice, setVoice] = useState("offline"),
    [muted, setMuted] = useState(false),
    [transcript, setTranscript] = useState([]),
    [activity, setActivity] = useState(""),
    [busy, setBusy] = useState(false),
    [running, setRunning] = useState(false),
    [output, setOutput] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("problem"),
    [elapsed, setElapsed] = useState(0),
    [feedback, setFeedback] = useState(null),
    [ending, setEnding] = useState(false),
    [saved, setSaved] = useState("Saved"),
    [pendingEdit, setPendingEdit] = useState(null),
    [showDiff, setShowDiff] = useState(false),
    [debugOn, setDebugOn] = useState(false),
    [bottomTab, setBottomTab] = useState("console"),
    [editorInstance, setEditorInstance] = useState(null);
  const state = useRef({
      index: 0,
      editors: initial.editors,
      code: initial.editors[0]?.code || "",
      transcript: [],
      busy: false,
      runResult: "",
      debugTrace: "",
      runs: {},
      segment: 0,
      seenEvents: new Set(),
      ending: false,
    }),
    live = useRef(null),
    saveChain = useRef(Promise.resolve()),
    captions = useRef(null),
    followCaptions = useRef(true),
    codeRef = useRef(null),
    editDecorations = useRef([]);
  const problem = initial.problems[index];
  const base = `/api/interviews/${initial.id}`;
  const captionRows = groupTranscript(transcript);
  useEffect(() => {
    connect();
  }, []);
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
    value = value || "";
    state.current.code = value;
    setCode(value);
    setSaved("Unsaved");
  }
  function save() {
    if (isBehavioral) return Promise.resolve();
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
        setSaved("Not saved");
        if (e.status === 409) {
          state.current.editors[target] = e.data.editor;
          setPendingEdit(e.data.editor);
          throw new Error(
            "The interviewer edited this file. Keep your draft or load their edit below.",
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
      const target = state.current.index,
        snapshot = state.current.code;
      const result = await api(base + "/agent", {
        index: target,
        request,
        transcript: state.current.transcript,
        runResult: state.current.runResult,
        debugTrace: state.current.debugTrace,
      });
      state.current.editors = state.current.editors.map((e, i) =>
        i === target ? result.editor : e,
      );
      setEditors(state.current.editors);
      let message = result.message;
      if (result.edits.length) {
        if (state.current.index === target && state.current.code === snapshot) {
          state.current.code = result.editor.code;
          setCode(result.editor.code);
          setSaved("Saved");
          setActivity(result.edits.map((e) => e.reason).join(" · "));
          highlightEdit(snapshot, result.editor.code);
        } else {
          setPendingEdit(result.editor);
          message +=
            " Your newer draft has been preserved; an interviewer edit is available to review.";
        }
      }

      if (live.current?.ready) {
        for (const chunk of message.match(/.{1,650}(?:\s|$)/gs) || [
          message.slice(0, 650),
        ])
          live.current.send("session.commentary.append", chunk, delegationId);
      }
      if (
        result.runCode &&
        state.current.index === target &&
        state.current.code === result.editor.code
      ) {
        await execute(
          state.current.code,
          initial.problems[state.current.index].testSuite
            ? "tests"
            : "scratchpad",
        );
      }
      return message;
    } catch (e) {
      setError(e.message);
      if (delegationId)
        live.current?.send(
          "session.commentary.append",
          "The backend could not finish this request. Ask the candidate to check the workspace error and retry.",
          delegationId,
        );
    } finally {
      state.current.busy = false;
      setBusy(false);
    }
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
  // Compact trace summary the reasoning backend receives with the next request.
  function onDebugTrace({ case: testCase, steps, result }) {
    const brief = (v) =>
      JSON.stringify(v.v ?? (v.t === "node" ? "node#" + v.id : v.t));
    const last = steps
      .slice(-30)
      .map(
        (s) =>
          `L${s.line}: ` +
          Object.entries(s.vars)
            .filter(([, v]) => v.t !== "fn")
            .map(([k, v]) => `${k}=${brief(v)}`.slice(0, 60))
            .join(" "),
      )
      .join("\n");
    const outcome = result.error
      ? "error: " + result.error
      : result.ok
        ? "passed"
        : "failed";
    const headline = `Visual debugger on case "${testCase?.name}": ${steps.length} steps, ${outcome}.`;
    state.current.debugTrace =
      `${headline}\nLast steps (line: variables):\n${last}`.slice(0, 4000);
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
    state.current.segment++;
    const connection = new LiveConnection({
      greeting: isBehavioral
        ? "Greet the candidate immediately, introduce yourself as their AI behavioral interviewer, and ask one introductory question grounded in their resume. Follow the configured style. Do not ask them to code. Then listen."
        : undefined,
      onStatus: setVoice,
      onEvent: onLiveEvent,
      onError: setError,
    });
    live.current = connection;
    void connection.connect(base + "/live");
  }
  async function execute(value = state.current.code, mode = "scratchpad") {
    const target = state.current.index;
    setRunning(true);
    const suite = mode === "tests" ? initial.problems[target].testSuite : null;
    const result = await runCode(value, initial.language, suite);
    if (state.current.index === target) {
      setOutput(result);
      setBottomTab("console");
      state.current.runResult = result.output;
    }
    state.current.runs[target] = [
      ...(state.current.runs[target] || []),
      { code: value, ...result },
    ];
    setRunning(false);
    live.current?.send(
      "session.thinking.append",
      `The browser ran problem ${target + 1} (${initial.problems[target].title}). Result: ${result.output.slice(0, 650)}`,
    );
    return result;
  }
  async function next() {
    if (state.current.busy) return;
    try {
      await save();
      await boards.current[state.current.index]?.flush?.();
      const nextIndex = index + 1;
      await api(base + "/current", { index: nextIndex });
      state.current.index = nextIndex;
      state.current.code = state.current.editors[nextIndex].code;
      setIndex(nextIndex);
      setCode(state.current.code);
      setOutput(null);
      state.current.runResult = "";
      state.current.debugTrace = "";
      setPendingEdit(null);
      live.current?.send(
        "session.thinking.append",
        `Candidate moved to problem ${nextIndex + 1}: ${initial.problems[nextIndex].title}. Ask about their approach; delegate technical details to the backend.`,
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
      await boards.current[state.current.index]?.flush?.();
      await live.current?.close();
      const result = await api(base + "/feedback", {
        transcript: state.current.transcript,
        runs: state.current.runs,
      });
      setFeedback(result);
    } catch (e) {
      setError(e.message);
    } finally {
      state.current.ending = false;
      setEnding(false);
    }
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
            "BEHAVIORAL INTERVIEW"
          ) : (
            <>
              PRACTICE ROOM <span>/</span>
              {String(index + 1).padStart(2, "0")} OF{" "}
              {String(initial.problems.length).padStart(2, "0")}
            </>
          )}
        </div>
        <div className="room-actions">
          <span className="clock">
            <Timer size={15} />
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </span>
          <button
            className="quiet"
            disabled={busy || running || ending || !!feedback}
            onClick={finish}
          >
            {ending ? "Preparing feedback…" : "Finish interview"}
            <ArrowUpRight size={15} />
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
        ) : (
          <section className="statement-pane">
            <div className="pane-tabs">
              <button
                className={tab === "problem" ? "active" : ""}
                onClick={() => setTab("problem")}
              >
                Problem
              </button>
              <button
                className={tab === "notes" ? "active" : ""}
                onClick={() => setTab("notes")}
              >
                Session guide
              </button>
            </div>
            <div className="statement-scroll">
              {tab === "problem" ? (
                <>
                  <div className="eyebrow muted">
                    PROBLEM {index + 1} / {initial.problems.length}
                  </div>
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
                </>
              ) : (
                <>
                  <h2>Think out loud.</h2>
                  <p>
                    Clarify the inputs. Explain your approach. Walk through an
                    example before you start coding.
                  </p>
                  <p>
                    Ask Alex for a hint, a code review, or an example test. Alex
                    can read and edit this file.
                  </p>
                  <p>
                    Run executes the whole file. Run tests calls your solution
                    automatically using the prepared suite. A suite pass is not
                    a full LeetCode judge verdict.
                  </p>
                  <p>
                    Code runs in your browser with a 15-second limit. Python may
                    take a moment to load.
                  </p>
                </>
              )}
            </div>
            <div className="problem-bottom">
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://leetcode.com/problems/${problem.slug}/`}
              >
                View on LeetCode
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
            {!isBehavioral && (
              <button
                className={workspaceTab === "code" ? "active" : ""}
                onClick={() => setWorkspaceTab("code")}
              >
                <Code2 size={14} />
                Code
              </button>
            )}
            <button
              className={workspaceTab === "canvas" ? "active" : ""}
              onClick={() => setWorkspaceTab("canvas")}
            >
              Whiteboard
            </button>
            <span>
              {isBehavioral
                ? "Map a project, decision, or story."
                : "Sketch an approach alongside your code."}
            </span>
          </div>
          {!isBehavioral && (
            <section
              className="editor-pane"
              style={{ display: workspaceTab === "code" ? "flex" : "none" }}
            >
              <div className="editor-toolbar">
                <span>
                  <Code2 size={16} />
                  {initial.language === "python3"
                    ? "solution.py"
                    : "solution.js"}
                </span>
                <div>
                  <span className="save-state">{saved}</span>
                  <button
                    className={"run debug-toggle " + (debugOn ? "active" : "")}
                    aria-pressed={debugOn}
                    title="Opt-in visual debugger: trace a test case step by step"
                    onClick={() => {
                      setDebugOn(!debugOn);
                      setBottomTab(!debugOn ? "debugger" : "console");
                    }}
                  >
                    <Bug size={13} />
                    Debugger
                  </button>
                  <button
                    className="run"
                    disabled={running || !problem.testSuite}
                    title={
                      problem.testSuite
                        ? `${problem.testCount} prepared tests`
                        : "No prepared suite for this problem yet"
                    }
                    onClick={() => execute(state.current.code, "tests")}
                  >
                    <Check size={13} />
                    Run tests
                    {problem.testSuite && (
                      <span className="test-count">{problem.testCount}</span>
                    )}
                  </button>
                  <button
                    className="run"
                    disabled={running}
                    onClick={() => execute()}
                  >
                    <Play size={13} />
                    {running ? "Running…" : "Run"}
                  </button>
                </div>
              </div>
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
                  Alex prepared an edit while you were typing. Your draft is
                  still here.
                  <button onClick={() => setShowDiff(true)}>
                    <GitCompare size={13} />
                    Show diff
                  </button>
                  <button
                    onClick={() => {
                      const before = state.current.code;
                      changeCode(pendingEdit.code);
                      highlightEdit(before, pendingEdit.code);
                      setPendingEdit(null);
                      setShowDiff(false);
                    }}
                  >
                    Load Alex’s edit
                  </button>
                  <button
                    onClick={() => {
                      setPendingEdit(null);
                      save().catch((e) => setError(e.message));
                    }}
                  >
                    Keep my draft
                  </button>
                </div>
              )}
              {debugOn && (
                <div className="bottom-tabs">
                  <button
                    className={bottomTab === "console" ? "active" : ""}
                    onClick={() => setBottomTab("console")}
                  >
                    <Terminal size={12} /> Console
                  </button>
                  <button
                    className={bottomTab === "debugger" ? "active" : ""}
                    onClick={() => setBottomTab("debugger")}
                  >
                    <Bug size={12} /> Debugger
                  </button>
                </div>
              )}
              {debugOn && bottomTab === "debugger" && (
                <Debugger
                  key={index}
                  suite={problem.testSuite}
                  language={initial.language}
                  code={code}
                  editor={editorInstance}
                  lastRun={output}
                  onTrace={onDebugTrace}
                />
              )}
              <div
                className="console"
                style={{
                  display:
                    debugOn && bottomTab === "debugger" ? "none" : undefined,
                }}
              >
                <div className="console-heading">
                  <Terminal size={14} /> CONSOLE
                  <span>
                    {output
                      ? output.total !== undefined
                        ? `${output.passed}/${output.total} passed`
                        : output.ok
                          ? "Finished"
                          : "Error"
                      : "Ready"}
                  </span>
                  <button
                    aria-label="Clear console"
                    onClick={() => setOutput(null)}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
                <pre className={output?.ok === false ? "failed" : ""}>
                  {output?.output ||
                    "Run your code to see output here.\nAdd example calls or assertions below your solution."}
                </pre>
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
          <div className="interviewer-title">
            <span className="eyebrow muted">YOUR INTERVIEWER</span>
            <span
              className={"connection " + (voice === "live" ? "connected" : "")}
            >
              <span className="live-dot" />
              {voice}
            </span>
          </div>
          <div className={"small-orb " + (voice === "live" ? "pulsing" : "")}>
            <div className="wave">
              {[12, 22, 35, 18, 30].map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </div>
          </div>
          <h2>Alex</h2>
          <p className="interviewer-sub">
            A second perspective on your next step.
          </p>
          <div className="voice-controls">
            {["offline", "ended", "disconnected"].includes(voice) ? (
              <button className="primary" onClick={connect}>
                <Headphones size={16} />
                Reconnect voice
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
                  {muted ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
                <button
                  aria-label="Play audio"
                  onClick={() =>
                    live.current?.audio
                      ?.play()
                      .catch((e) => setError(e.message))
                  }
                >
                  <Volume2 size={17} />
                </button>
                <button
                  aria-label="Stop voice"
                  onClick={() => live.current?.close()}
                >
                  <Square size={14} />
                </button>
              </>
            )}
          </div>
          <div className="transcript-label">
            <span>CONVERSATION</span>
            <span>{busy ? "Reviewing your work…" : "Live captions"}</span>
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
                <span className="quote">“</span>Start with what you know.
                <br />
                We’ll work through the rest.
                <p>
                  {voice === "connecting"
                    ? "Alex is joining your room…"
                    : "Your spoken conversation will appear here."}
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
          <p className="speech-hint">
            <Mic size={13} />
            {isBehavioral
              ? "Talk through an experience. Alex will follow up."
              : "Ask for a hint or code review out loud."}
          </p>
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
                <span className="eyebrow muted">ALEX’S EDIT</span>
                <h2>Your draft → suggested change</h2>
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
                Keep my draft
              </button>
              <button
                className="primary"
                onClick={() => {
                  const before = state.current.code;
                  changeCode(pendingEdit.code);
                  highlightEdit(before, pendingEdit.code);
                  setPendingEdit(null);
                  setShowDiff(false);
                }}
              >
                Apply edit
              </button>
            </div>
          </section>
        </div>
      )}
      {feedback && (
        <div className="modal-backdrop">
          <section className="feedback card">
            <span className="eyebrow muted">ONE INTERVIEW CLOSER</span>
            <h2>Practice, reflected.</h2>
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
                <h3>What went well</h3>
                <ul>
                  {feedback.strengths.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Focus for next time</h3>
                <ol>
                  {feedback.next_steps.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ol>
              </section>
            </div>
            <div className="feedback-actions">
              <button className="quiet" onClick={download}>
                <Download size={16} />
                Export session
              </button>
              <button
                className="primary"
                disabled={voice === "closing"}
                onClick={onExit}
              >
                Back to practice
                <ArrowRight size={16} />
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
