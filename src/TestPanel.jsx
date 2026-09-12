import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { verdict } from "./domain.mjs";
export { verdict };
const preview = (v) => {
  const t = JSON.stringify(v);
  return t === undefined
    ? "undefined"
    : t.length > 400
      ? t.slice(0, 400) + "…"
      : t;
};
let counter = 0;
export const newCase = (spec) => ({
  id: `c${Date.now().toString(36)}${counter++}`,
  input: spec.params.map(() => ""),
  expected: "",
});
const validJson = (text) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
// Live validation mirrors buildCustomSuite: every input must parse; expected may be blank.
export const caseProblems = (c, spec) => {
  const problems = [];
  spec.params.forEach((p, j) => {
    if (!validJson(c.input[j] ?? ""))
      problems.push(`${p.name} is not valid JSON`);
  });
  if ((c.expected ?? "").trim() && !validJson(c.expected))
    problems.push("expected is not valid JSON");
  return problems;
};
function CaseTabs({ count, active, onSelect, onRemove, onAdd, marks }) {
  const removable = onRemove && count > 1;
  return (
    <div className="tc-tabs">
      <div role="tablist" className="tc-tablist">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={
              "tc-tab " + (i === active ? "active " : "") + (marks?.[i] || "")
            }
          >
            <button
              role="tab"
              aria-selected={i === active}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (removable && e.key === "Delete") {
                  e.preventDefault();
                  onRemove(i);
                }
              }}
            >
              {marks?.[i] && <i className="tc-dot" />}
              Case {i + 1}
            </button>
            {removable && (
              <button
                className="tc-x"
                aria-label={`Remove case ${i + 1}`}
                onClick={() => onRemove(i)}
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
      {onAdd && (
        <button className="tc-add" aria-label="Add testcase" onClick={onAdd}>
          <Plus size={13} />
        </button>
      )}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="tc-field">
      <span>{label} =</span>
      {children}
    </div>
  );
}
export function Testcases({ spec, cases, onChange }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (active >= cases.length) setActive(Math.max(0, cases.length - 1));
  }, [cases.length]);
  if (!spec)
    return (
      <p className="tc-empty">
        Class-design problem: Run executes the file and shows its output.
      </p>
    );
  const c = cases[active];
  const problems = c ? caseProblems(c, spec) : [];
  const marks = cases.map((x) => (caseProblems(x, spec).length ? "bad" : ""));
  const update = (patch) =>
    onChange(cases.map((x, i) => (i === active ? { ...x, ...patch } : x)));
  return (
    <div className="tc-panel">
      <CaseTabs
        count={cases.length}
        active={active}
        marks={marks}
        onSelect={setActive}
        onRemove={(i) => {
          onChange(cases.filter((_, j) => j !== i));
          if (i <= active) setActive(Math.max(0, active - 1));
        }}
        onAdd={
          cases.length < 50
            ? () => {
                onChange([...cases, newCase(spec)]);
                setActive(cases.length);
              }
            : null
        }
      />
      {c && (
        <div className="tc-fields">
          {spec.params.map((p, j) => (
            <Field label={p.name} key={p.name}>
              <textarea
                aria-label={`Case ${active + 1} ${p.name}`}
                rows={1}
                maxLength={60000}
                spellCheck={false}
                value={c.input[j] ?? ""}
                onChange={(e) =>
                  update({
                    input: spec.params.map((_, k) =>
                      k === j ? e.target.value : (c.input[k] ?? ""),
                    ),
                  })
                }
              />
            </Field>
          ))}
          <Field label="expected">
            <textarea
              aria-label={`Case ${active + 1} expected`}
              rows={1}
              spellCheck={false}
              placeholder="optional"
              maxLength={60000}
              value={c.expected ?? ""}
              onChange={(e) => update({ expected: e.target.value })}
            />
          </Field>
          {problems.length > 0 && (
            <ul className="tc-problems">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!cases.length && <p className="tc-empty">No testcases. Add one.</p>}
    </div>
  );
}
// Shows the inputs the run actually used, not the live panel text.
function CaseDetail({ spec, row }) {
  return (
    <div className="tc-detail">
      {spec &&
        spec.params.map((p, j) => (
          <Field label={p.name} key={p.name}>
            <pre>{preview(row.input?.[j])}</pre>
          </Field>
        ))}
      {row.error ? (
        <Field label="error">
          <pre className="bad">{row.error}</pre>
        </Field>
      ) : (
        <Field label="output">
          <pre>{preview(row.actual)}</pre>
        </Field>
      )}
      {"expected" in row && row.expected !== undefined && (
        <Field label="expected">
          <pre>{preview(row.expected)}</pre>
        </Field>
      )}
    </div>
  );
}
export function TestResult({ spec, cases, result, running }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!result?.results) return;
    const firstBad = result.results.findIndex(
      (r) => r.error || r.passed === false,
    );
    setActive(firstBad >= 0 ? firstBad : 0);
  }, [result]);
  if (running) return <p className="tc-empty">Running…</p>;
  if (!result) return <p className="tc-empty">Run or submit to see results.</p>;
  const v = verdict(result);
  const status = (extra) => (
    <div className={"tc-status " + v.tone}>
      {v.label}
      {extra}
    </div>
  );
  if (result.kind === "invalid")
    return (
      <div className="tc-panel">
        {status()}
        <ul className="tc-problems">
          {result.errors.map((p) => (
            <li key={p.index}>
              Case {p.index + 1}: {p.error}
            </li>
          ))}
        </ul>
      </div>
    );
  if (result.kind === "empty")
    return (
      <div className="tc-panel">
        {status()}
        <p className="tc-empty">Add a testcase, then Run.</p>
      </div>
    );
  const rows = result.results;
  if (!rows)
    return (
      <div className="tc-panel">
        {status()}
        <pre className="tc-stdout">{result.output}</pre>
      </div>
    );
  if (result.kind === "submit") {
    const failing = rows.find((r) => r.error || r.passed === false);
    return (
      <div className="tc-panel">
        {status(
          <small>
            {result.passed}/{result.total} testcases passed
          </small>,
        )}
        {failing && <CaseDetail spec={spec} row={failing} />}
        {failing && <div className="tc-case-name">{failing.name}</div>}
      </div>
    );
  }
  const graded = rows.filter((r) => r.passed !== null || r.error);
  const marks = rows.map((r) =>
    r.error || r.passed === false ? "bad" : r.passed ? "good" : "",
  );
  const row = rows[active];
  return (
    <div className="tc-panel">
      {status(
        <>
          {graded.length > 0 && (
            <small>
              {rows.filter((r) => r.passed).length}/{graded.length} testcases
              passed
            </small>
          )}
          {result.fallback && (
            <small>no hidden tests · ran your testcases</small>
          )}
          {result.casesSnapshot !== undefined &&
            result.casesSnapshot !== JSON.stringify(cases) && (
              <small>testcases changed since this run</small>
            )}
        </>,
      )}
      <CaseTabs
        count={rows.length}
        active={active}
        onSelect={setActive}
        marks={marks}
      />
      {row && <CaseDetail spec={spec} row={row} />}
      {result.stdout && (
        <Field label="stdout">
          <pre className="tc-stdout">{result.stdout}</pre>
        </Field>
      )}
    </div>
  );
}
