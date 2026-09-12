import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Lightbulb,
  Lock,
  Send,
  X,
} from "lucide-react";
import { MathText } from "./math.jsx";
import { conceptLabel } from "./setups.jsx";
import { sourceLabels } from "./modes.mjs";
const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
export function ProbabilityPane({
  problem,
  index,
  total,
  attempts,
  solution,
  busy,
  onSubmit,
  onReveal,
  onHint,
  hints = 0,
  onNext,
}) {
  const [answer, setAnswer] = useState("");
  useEffect(() => setAnswer(""), [index]);
  const solved = attempts.some((a) => a.correct);
  const revealed = attempts.some((a) => a.revealed);
  const done = solved || revealed;
  return (
    <section className="statement-pane probability-pane">
      <div className="statement-scroll">
        <div className="meta">
          {sourceLabels[problem.source] || problem.source}
          {problem.difficulty10 ? ` · level ${problem.difficulty10}` : ""}
        </div>
        <h1>{problem.title.replace(/ Problems\/Problem /, " · Problem ")}</h1>
        <div className="problem-meta">
          {problem.concepts.map((c) => (
            <span key={c}>{conceptLabel(c)}</span>
          ))}
          {problem.firms.slice(0, 4).map((f) => (
            <span key={f} className="firm">
              {f}
            </span>
          ))}
        </div>
        <MathText className="statement" text={problem.statement} />
        <form
          className="answer-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (answer.trim()) onSubmit(answer.trim());
          }}
        >
          <label htmlFor="answer" className="field-label">
            Answer
          </label>
          <div className="answer-row">
            <input
              id="answer"
              value={answer}
              maxLength={200}
              disabled={done || busy}
              placeholder="fraction or decimal"
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              className="primary"
              disabled={done || busy || !answer.trim()}
            >
              <Send size={14} /> Check
            </button>
          </div>
        </form>
        {attempts.length > 0 && (
          <ul className="attempts">
            {attempts.map((a, i) => (
              <li
                key={i}
                className={
                  a.correct ? "correct" : a.revealed ? "revealed" : "wrong"
                }
              >
                {a.revealed ? (
                  <Eye size={13} />
                ) : a.correct ? (
                  <Check size={13} />
                ) : (
                  <X size={13} />
                )}
                {a.revealed ? "Answer revealed" : a.answer}
              </li>
            ))}
          </ul>
        )}
        {!done && (
          <div className="answer-actions">
            <button className="quiet" onClick={onHint} disabled={busy}>
              <Lightbulb size={14} /> Hint{hints ? ` · ${hints}` : ""}
            </button>
            {attempts.length > 0 && (
              <button className="quiet" onClick={onReveal} disabled={busy}>
                <Eye size={14} /> Reveal answer
              </button>
            )}
          </div>
        )}
        {done && solution && (
          <div className="solution">
            <div className="meta">{solved ? "Solved" : "Reference"}</div>
            {solution.answer && (
              <MathText
                className="solution-answer"
                text={`Answer: $${solution.answer}$`}
              />
            )}
            {solution.solution && (
              <details open={!solved || !solution.answer}>
                <summary>Reference solution</summary>
                <MathText text={solution.solution} />
              </details>
            )}
          </div>
        )}
      </div>
      <div className="problem-bottom">
        {problem.url ? (
          <a target="_blank" rel="noreferrer" href={problem.url}>
            Source <ArrowUpRight size={14} />
          </a>
        ) : (
          <span />
        )}
        {index < total - 1 && (
          <button className="quiet" onClick={onNext} disabled={busy}>
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
export function DesignPane({
  problem,
  design,
  stages,
  elapsedMs,
  busy,
  onAdvance,
}) {
  const remaining = design.durationMs - elapsedMs;
  const over = remaining <= 0;
  const nextIn =
    design.nextAt === null
      ? null
      : design.nextAt * design.durationMs - elapsedMs;
  const pct = Math.min(100, (elapsedMs / design.durationMs) * 100);
  return (
    <section className="statement-pane design-pane">
      <div className="pane-tabs">
        <span className="stage-count">
          {stages.length} / {design.stageCount} constraints
        </span>
      </div>
      <div className={"time-bar " + (over ? "over" : "")}>
        <i style={{ width: pct + "%" }} />
      </div>
      <div className="statement-scroll">
        <div className="meta">{problem.category}</div>
        <h1>{problem.title}</h1>
        <p className="brief">{problem.brief}</p>
        <div className="stages">
          {stages.map((st, i) => (
            <div
              className={"stage " + (i === stages.length - 1 ? "latest" : "")}
              key={i}
            >
              <span className="stage-num">{i + 1}</span>
              <div>
                <strong>{st.title}</strong>
                <p>{st.constraint}</p>
              </div>
            </div>
          ))}
          {stages.length < design.stageCount && (
            <div className="stage upcoming">
              <span className="stage-num">
                <Lock size={11} />
              </span>
              <div>
                <strong>Next constraint</strong>
                <p>{nextIn !== null && nextIn > 0 ? mmss(nextIn) : "Now"}</p>
                <button className="quiet" onClick={onAdvance} disabled={busy}>
                  Reveal now <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
        {over && (
          <div className="time-over">Time is up. Summarize and finish.</div>
        )}
      </div>
    </section>
  );
}
export function NotesEditor({ value, onChange, placeholder, label }) {
  return (
    <section className="notes-pane">
      <div className="editor-toolbar">
        <span>{label}</span>
      </div>
      <textarea
        className="notes"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </section>
  );
}
