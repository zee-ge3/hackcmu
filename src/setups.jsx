import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Search, X } from "lucide-react";
import { api } from "./api.mjs";
import { useAccount } from "./account.jsx";
import { KeyNotice } from "./pages.jsx";
import { PresetPicker } from "./PresetPicker.jsx";
import { useAsync, ErrorBanner } from "./ui.jsx";
import { sourceLabels } from "./modes.mjs";
import {
  probabilityPresets,
  probabilityLevels,
  designPresets,
  designDurations,
} from "./modes.mjs";
import { interviewerPresets } from "./interviewer.mjs";
import { filterProblems } from "./domain.mjs";
const defaultFilters = {
  testedOnly: true,
  companies: [],
  topics: [],
  lists: [],
  pinned: [],
  difficulty: "all",
  search: "",
};
const conceptLabels = {
  basic: "Basics",
  logic: "Logic & brainteasers",
  martingale: "Martingales",
  expectation: "Expectation",
  geometric: "Geometric probability",
  conditional: "Conditioning & Bayes",
  "inclusion-exclusion": "Inclusion–exclusion",
  "waiting-time": "Waiting times",
  counting: "Counting",
  "order-stats": "Order statistics",
  "random-walk": "Random walks",
  markov: "Markov chains",
  distributions: "Distributions",
  strategy: "Strategy",
};
export const conceptLabel = (c) => conceptLabels[c] || c;
export function CodingSetup({ onStart, navigate }) {
  const { user } = useAccount();
  const hasKey = !!user?.openaiKeyHint;
  const [catalog, setCatalog] = useState([]),
    [filters, setFilters] = useState(defaultFilters),
    [count, setCount] = useState(2),
    [language, setLanguage] = useState("javascript"),
    [debuggerEnabled, setDebuggerEnabled] = useState(false),
    [style, setStyle] = useState(interviewerPresets[0].id),
    [prompt, setPrompt] = useState(interviewerPresets[0].prompt),
    [ready, setReady] = useState(false);
  const { loading, error, setError, run } = useAsync();
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
    await run(async () => {
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
    });
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
          <ErrorBanner error={error} />
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
export function ProbabilitySetup({ onStart, navigate }) {
  const { user } = useAccount();
  const hasKey = !!user?.openaiKeyHint;
  const [catalog, setCatalog] = useState(null),
    [level, setLevel] = useState("all"),
    [concepts, setConcepts] = useState([]),
    [firms, setFirms] = useState([]),
    [sources, setSources] = useState([]),
    [count, setCount] = useState(2),
    [style, setStyle] = useState(probabilityPresets[0].id),
    [prompt, setPrompt] = useState(probabilityPresets[0].prompt);
  const { loading, error, setError, run } = useAsync();
  useEffect(() => {
    api("/api/probability/catalog", undefined, "GET")
      .then((d) => setCatalog(d.problems))
      .catch((e) => setError(e.message));
  }, []);
  const toggle = (list, set, value) =>
    set(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  const matching = (catalog || []).filter(
    (q) =>
      (level === "all" || probabilityLevels[level].test(q.difficulty10)) &&
      (!concepts.length || concepts.some((c) => q.concepts.includes(c))) &&
      (!firms.length || firms.some((f) => q.firms.includes(f))) &&
      (!sources.length || sources.includes(q.source)),
  );
  const conceptCounts = {};
  const firmCounts = {};
  const sourceCounts = {};
  for (const q of catalog || []) {
    for (const c of q.concepts) conceptCounts[c] = (conceptCounts[c] || 0) + 1;
    for (const f of q.firms) firmCounts[f] = (firmCounts[f] || 0) + 1;
    sourceCounts[q.source] = (sourceCounts[q.source] || 0) + 1;
  }
  async function start() {
    await run(async () => {
      onStart(
        await api("/api/interviews", {
          mode: "probability",
          count,
          level,
          concepts,
          firms,
          sources,
          interviewerStyle: style,
          interviewerPrompt: prompt,
        }),
      );
    });
  }
  return (
    <main className="setup page">
      <header className="page-head">
        <h1>Probability</h1>
      </header>
      <div className="setup-grid">
        <section className="config card">
          <h2>Questions</h2>
          <label className="field-label">Difficulty</label>
          <div className="segmented">
            {[
              ["all", "Mixed"],
              ...Object.entries(probabilityLevels).map(([k, v]) => [
                k,
                v.label,
              ]),
            ].map(([k, label]) => (
              <button
                key={k}
                className={level === k ? "active" : ""}
                onClick={() => setLevel(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="field-label">Concepts</label>
          <div className="chips">
            {Object.entries(conceptCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([c, n]) => (
                <button
                  key={c}
                  className={"chip " + (concepts.includes(c) ? "selected" : "")}
                  onClick={() => toggle(concepts, setConcepts, c)}
                >
                  {concepts.includes(c) && <Check size={13} />}{" "}
                  {conceptLabel(c)} <small>{n}</small>
                </button>
              ))}
          </div>
          {Object.keys(firmCounts).length > 0 && (
            <>
              <label className="field-label">Asked at</label>
              <div className="chips">
                {Object.entries(firmCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([f, n]) => (
                    <button
                      key={f}
                      className={
                        "chip " + (firms.includes(f) ? "selected" : "")
                      }
                      onClick={() => toggle(firms, setFirms, f)}
                    >
                      {f} <small>{n}</small>
                    </button>
                  ))}
              </div>
            </>
          )}
          <label className="field-label">Sources</label>
          <div className="chips">
            {Object.entries(sourceCounts).map(([src, n]) => (
              <button
                key={src}
                className={"chip " + (sources.includes(src) ? "selected" : "")}
                onClick={() => toggle(sources, setSources, src)}
              >
                {sourceLabels[src] || src} <small>{n}</small>
              </button>
            ))}
          </div>
          <h2>Session</h2>
          <div className="two-fields">
            <div>
              <label className="field-label" htmlFor="prob-count">
                Questions
              </label>
              <div className="stepper">
                <button
                  aria-label="Fewer questions"
                  disabled={count <= 1}
                  onClick={() => setCount(count - 1)}
                >
                  −
                </button>
                <input
                  id="prob-count"
                  type="number"
                  min="1"
                  max="5"
                  value={count}
                  onChange={(e) =>
                    setCount(
                      Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                    )
                  }
                />
                <button
                  aria-label="More questions"
                  disabled={count >= 5}
                  onClick={() => setCount(count + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <PresetPicker
            presets={probabilityPresets}
            style={style}
            setStyle={setStyle}
            prompt={prompt}
            setPrompt={setPrompt}
            id="probability-prompt"
          />
          <div className="start-area">
            <button
              className="primary start"
              onClick={start}
              disabled={
                loading || matching.length < count || !prompt.trim() || !hasKey
              }
            >
              {loading ? "Starting…" : "Start"}
              <ArrowRight size={16} />
            </button>
            {catalog && matching.length < count && (
              <span className="match-count">Only {matching.length} match</span>
            )}
            {!hasKey && <KeyNotice navigate={navigate} />}
          </div>
          <ErrorBanner error={error} />
        </section>
        <aside>
          <section className="library card">
            <h2>
              Matches <small>{matching.length.toLocaleString()}</small>
            </h2>
            <div className="problem-list">
              {matching.slice(0, 30).map((q) => (
                <div className="problem-row" key={q.id}>
                  <span className="problem-id">
                    {q.difficulty10 ? `L${q.difficulty10}` : "—"}
                  </span>
                  <span>{q.title}</span>
                  <span className="difficulty">
                    {sourceLabels[q.source] || q.source}
                  </span>
                </div>
              ))}
              {catalog && !matching.length && (
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
export function DesignSetup({ onStart, navigate }) {
  const { user } = useAccount();
  const hasKey = !!user?.openaiKeyHint;
  const [problems, setProblems] = useState(null),
    [problemId, setProblemId] = useState(null),
    [custom, setCustom] = useState({ title: "", brief: "" }),
    [duration, setDuration] = useState(30),
    [style, setStyle] = useState(designPresets[0].id),
    [prompt, setPrompt] = useState(designPresets[0].prompt);
  const { loading, error, setError, run } = useAsync();
  useEffect(() => {
    api("/api/design/problems", undefined, "GET")
      .then((d) => {
        setProblems(d.problems);
        setProblemId(d.problems[0]?.id || null);
      })
      .catch((e) => setError(e.message));
  }, []);
  const useCustom = problemId === "custom";
  const ready = useCustom
    ? custom.title.trim() && custom.brief.trim()
    : !!problemId;
  async function start() {
    await run(async () => {
      onStart(
        await api("/api/interviews", {
          mode: "design",
          problemId: useCustom ? undefined : problemId,
          custom: useCustom ? custom : undefined,
          duration,
          interviewerStyle: style,
          interviewerPrompt: prompt,
        }),
      );
    });
  }
  return (
    <main className="setup page">
      <header className="page-head">
        <h1>System design</h1>
      </header>
      <div className="setup-grid">
        <section className="config card">
          <h2>System</h2>
          <div className="design-grid">
            {(problems || []).map((p) => (
              <button
                type="button"
                key={p.id}
                className={
                  "design-option " + (problemId === p.id ? "selected" : "")
                }
                onClick={() => setProblemId(p.id)}
              >
                <strong>{p.title}</strong>
                <span>{p.summary}</span>
                <small>{p.category}</small>
              </button>
            ))}
            <button
              type="button"
              className={
                "design-option custom " + (useCustom ? "selected" : "")
              }
              onClick={() => setProblemId("custom")}
            >
              <strong>Custom</strong>
              <span>Write your own brief.</span>
              <small>Your constraints</small>
            </button>
          </div>
          {useCustom && (
            <div className="custom-brief">
              <label className="field-label" htmlFor="design-title">
                Title
              </label>
              <input
                id="design-title"
                maxLength={120}
                value={custom.title}
                onChange={(e) =>
                  setCustom({ ...custom, title: e.target.value })
                }
                placeholder="Multiplayer leaderboard"
              />
              <label className="field-label" htmlFor="design-brief">
                Brief
              </label>
              <textarea
                id="design-brief"
                rows={4}
                maxLength={3000}
                value={custom.brief}
                onChange={(e) =>
                  setCustom({ ...custom, brief: e.target.value })
                }
                placeholder="Users, core features, known scale."
              />
            </div>
          )}
        </section>
        <aside>
          <section className="config card">
            <h2>Session</h2>
            <label className="field-label">Duration</label>
            <div className="segmented">
              {designDurations.map((m) => (
                <button
                  key={m}
                  className={duration === m ? "active" : ""}
                  onClick={() => setDuration(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="field-hint">
              {useCustom
                ? "3 constraints improvised by the interviewer as the design matures."
                : "3 constraints, revealed on a timer or when a step is done."}
            </p>
            <PresetPicker
              presets={designPresets}
              style={style}
              setStyle={setStyle}
              prompt={prompt}
              setPrompt={setPrompt}
              id="design-prompt"
            />
            <div className="start-area">
              <button
                className="primary start"
                onClick={start}
                disabled={loading || !ready || !prompt.trim() || !hasKey}
              >
                {loading ? "Starting…" : "Start"}
                <ArrowRight size={16} />
              </button>
              {!hasKey && <KeyNotice navigate={navigate} />}
            </div>
            <ErrorBanner error={error} />
          </section>
        </aside>
      </div>
    </main>
  );
}
