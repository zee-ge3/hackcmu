import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Dices,
  Network,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { api } from "./api.mjs";
import { useAccount } from "./account.jsx";
import { KeyNotice } from "./pages.jsx";
import {
  probabilityPresets,
  probabilityLevels,
  designPresets,
  designDurations,
} from "./modes.mjs";
export function PresetPicker({
  presets,
  style,
  setStyle,
  prompt,
  setPrompt,
  id,
}) {
  return (
    <div className="interviewer-config">
      <label className="field-label">
        Interviewer style <span>Choose a starting point</span>
      </label>
      <div className="preset-grid">
        {presets.map((p) => (
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
        <label htmlFor={id}>Instructions for this interview</label>
        <textarea
          id={id}
          maxLength={6000}
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </details>
    </div>
  );
}
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
const sourceLabels = {
  quantprof: "QuantProf (trading firms)",
  quantprof_youtube: "QuantProf video",
  aops_wiki: "AoPS wiki",
  MATH: "MATH (AMC-derived)",
  AIME: "AIME",
  AIMO_AMC: "AMC validation",
  AIMO_AIME: "AIME validation",
};
export const conceptLabel = (c) => conceptLabels[c] || c;
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
    [prompt, setPrompt] = useState(probabilityPresets[0].prompt),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
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
    setLoading(true);
    setError("");
    try {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="setup coding-setup">
      <div className="page-heading">
        <span className="eyebrow muted">PROBABILITY PRACTICE</span>
        <h1>Reason under uncertainty, out loud.</h1>
      </div>
      <div className="setup-grid">
        <section className="config card">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">PICK YOUR QUESTIONS</span>
              <h2>Set up the session</h2>
            </div>
            <Dices size={20} />
          </div>
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
          <label className="field-label">
            Concepts <span>Optional · choose any</span>
          </label>
          <div className="chips">
            {Object.entries(conceptCounts)
              .sort((a, b) => b[1] - a[1])
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
          <label className="field-label">
            Asked at <span>Optional · trading firms from QuantProf</span>
          </label>
          <div className="chips">
            {Object.entries(firmCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([f, n]) => (
                <button
                  key={f}
                  className={"chip " + (firms.includes(f) ? "selected" : "")}
                  onClick={() => toggle(firms, setFirms, f)}
                >
                  {f} <small>{n}</small>
                </button>
              ))}
          </div>
          <label className="field-label">
            Sources <span>Optional</span>
          </label>
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
            <div className="match-count">
              <span className="live-dot" />
              {catalog
                ? `${matching.length.toLocaleString()} matching questions`
                : "Loading the question bank…"}
            </div>
            <button
              className="primary start"
              onClick={start}
              disabled={
                loading || matching.length < count || !prompt.trim() || !hasKey
              }
            >
              {loading ? "Preparing your interview…" : "Enter probability room"}
              <ArrowRight size={18} />
            </button>
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
                <span className="eyebrow muted">QUESTION BANK</span>
                <h3>
                  {(catalog?.length || 0).toLocaleString()} questions with
                  reference answers.
                </h3>
              </div>
              <span className="tiny-tag">QUANT</span>
            </div>
            <div className="problem-list">
              {matching.slice(0, 5).map((q) => (
                <div className="problem-row" key={q.id}>
                  <span className="problem-id">
                    {q.difficulty10 ? `L${q.difficulty10}` : "—"}
                  </span>
                  <span>{q.title}</span>
                  <span className="difficulty">
                    {sourceLabels[q.source]?.split(" ")[0] || q.source}
                  </span>
                </div>
              ))}
              {catalog && !matching.length && (
                <p className="muted">No matches. Try fewer filters.</p>
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
    [prompt, setPrompt] = useState(designPresets[0].prompt),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
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
    setLoading(true);
    setError("");
    try {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="setup coding-setup">
      <div className="page-heading">
        <span className="eyebrow muted">SYSTEM DESIGN PRACTICE</span>
        <h1>Design it before the clock runs out.</h1>
      </div>
      <div className="setup-grid single">
        <section className="config card">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">THE PROBLEM</span>
              <h2>Choose a system</h2>
            </div>
            <Network size={20} />
          </div>
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
                <span className="eyebrow muted">
                  {p.category.toUpperCase()}
                </span>
                <strong>{p.title}</strong>
                <span>{p.summary}</span>
                <small>{p.stageCount} added constraints</small>
              </button>
            ))}
            <button
              type="button"
              className={
                "design-option custom " + (useCustom ? "selected" : "")
              }
              onClick={() => setProblemId("custom")}
            >
              <span className="eyebrow muted">YOUR OWN</span>
              <strong>Custom brief</strong>
              <span>
                Bring a prompt from a real interview or a system you want to
                practice.
              </span>
              <small>Alex invents the constraints</small>
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
                placeholder="e.g. Multiplayer leaderboard"
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
                placeholder="What should the candidate design? Mention the users, core features, and any scale you already know."
              />
            </div>
          )}
          <label className="field-label">Time limit</label>
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
              {loading ? "Preparing your interview…" : "Enter design room"}
              <ArrowRight size={18} />
            </button>
            {!hasKey && <KeyNotice navigate={navigate} />}
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
