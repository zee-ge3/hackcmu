import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Bug,
  Sparkles,
} from "lucide-react";
import { traceCode } from "./runner.mjs";
import { briefValue as text, fillCaption } from "./captions.mjs";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// A value that changed since the previous step shows the old value struck through.
function Scalar({ value, prev }) {
  const changed = prev !== undefined && !same(value, prev);
  return (
    <span className={"dbg-scalar " + (changed ? "changed" : "")}>
      {changed && <s>{text(prev)}</s>}
      {text(value)}
    </span>
  );
}
function Cells({ items, prevItems, pointers, total }) {
  const cells = items.map((item, i) => {
    const changed =
      prevItems && prevItems[i] !== undefined && !same(item, prevItems[i]);
    const marks = pointers.filter((p) => p.index === i);
    return (
      <div
        key={i}
        className={
          "dbg-cell " +
          (changed ? "changed " : "") +
          (marks.length ? "pointed" : "")
        }
      >
        <span className="dbg-index">{i}</span>
        <span className="dbg-value">{text(item)}</span>
        <span className="dbg-pointers">
          {marks.map((p) => (
            <b key={p.name}>{p.name}</b>
          ))}
        </span>
      </div>
    );
  });
  const endMarks = pointers.filter((p) => p.index === total);
  if (endMarks.length || total > items.length)
    cells.push(
      <div
        key="end"
        className={"dbg-cell end " + (endMarks.length ? "pointed" : "")}
      >
        <span className="dbg-index">{total > items.length ? "…" : total}</span>
        <span className="dbg-value">
          {total > items.length ? `+${total - items.length}` : ""}
        </span>
        <span className="dbg-pointers">
          {endMarks.map((p) => (
            <b key={p.name}>{p.name}</b>
          ))}
        </span>
      </div>,
    );
  return <div className="dbg-cells">{cells}</div>;
}
// Hash maps, sets and plain-object dictionaries as key/value cells; a key that
// was not there on the previous step is highlighted.
const entriesOf = (v) =>
  v.t === "map"
    ? v.v.map(([k, x]) => [text(k), x])
    : v.t === "set"
      ? v.v.map((x) => [text(x), null])
      : Object.entries(v.v);
function Entries({ value, prev }) {
  const entries = entriesOf(value);
  const before = prev && prev.t === value.t ? new Map(entriesOf(prev)) : null;
  if (!entries.length) return <span className="dbg-scalar dbg-dim">empty</span>;
  return (
    <div className="dbg-cells">
      {entries.map(([k, x]) => {
        const changed =
          before && (!before.has(k) || (x !== null && !same(x, before.get(k))));
        return (
          <div key={k} className={"dbg-cell " + (changed ? "changed" : "")}>
            <span className="dbg-index">{k}</span>
            <span className="dbg-value">{x === null ? "•" : text(x)}</span>
          </div>
        );
      })}
      {value.n > entries.length && (
        <div className="dbg-cell end">
          <span className="dbg-index">…</span>
          <span className="dbg-value">+{value.n - entries.length}</span>
        </div>
      )}
    </div>
  );
}
function Chain({ ids, nodes, prevNodes, pointers }) {
  return (
    <div className="dbg-cells chain">
      {ids.map((id, i) => {
        const node = nodes[id];
        const prev = prevNodes?.[id];
        const marks = pointers.filter((p) => p.id === id);
        const relinked = prev && prev.next !== node.next;
        return (
          <React.Fragment key={id}>
            <div
              className={
                "dbg-cell node " +
                (marks.length ? "pointed " : "") +
                (relinked ? "changed" : "")
              }
            >
              <span className="dbg-index">#{id}</span>
              <span className="dbg-value">{String(node.val)}</span>
              <span className="dbg-pointers">
                {marks.map((p) => (
                  <b key={p.name}>{p.name}</b>
                ))}
              </span>
            </div>
            {i < ids.length - 1 && <span className="dbg-arrow">→</span>}
            {i === ids.length - 1 && (
              <span className="dbg-arrow end">
                {node.next ? "↺" : "→ null"}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
function Tree({ id, nodes, pointers, depth = 0 }) {
  const node = nodes[id];
  if (!node || depth > 6) return null;
  const marks = pointers.filter((p) => p.id === id);
  return (
    <div className="dbg-tree">
      <div className={"dbg-cell node " + (marks.length ? "pointed" : "")}>
        <span className="dbg-value">{String(node.val)}</span>
        <span className="dbg-pointers">
          {marks.map((p) => (
            <b key={p.name}>{p.name}</b>
          ))}
        </span>
      </div>
      {(node.left || node.right) && (
        <div className="dbg-branches">
          <div>
            {node.left ? (
              <Tree
                id={node.left}
                nodes={nodes}
                pointers={pointers}
                depth={depth + 1}
              />
            ) : (
              <span className="dbg-leaf">null</span>
            )}
          </div>
          <div>
            {node.right ? (
              <Tree
                id={node.right}
                nodes={nodes}
                pointers={pointers}
                depth={depth + 1}
              />
            ) : (
              <span className="dbg-leaf">null</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const isTable = (v) =>
  v.t === "map" ||
  v.t === "set" ||
  (v.t === "obj" &&
    Object.keys(v.v).length > 0 &&
    Object.keys(v.v).length <= 40);
function Snapshot({ snap, prev }) {
  if (!snap) return null;
  const vars = Object.entries(snap.vars).filter(([, v]) => v.t !== "fn");
  const ints = vars.filter(
    ([, v]) => v.t === "num" && Number.isInteger(v.v) && v.v >= 0,
  );
  // Integer variables that fit inside a sequence are drawn as pointers on it.
  const sequences = vars.filter(
    ([, v]) =>
      v.t === "arr" || (v.t === "str" && v.v.length > 1 && v.v.length <= 80),
  );
  const tables = vars.filter(([, v]) => isTable(v));
  const pointerFor = (name, length) =>
    ints
      .filter(([n, v]) => n !== name && v.v <= length)
      .map(([n, v]) => ({ name: n, index: v.v }));
  const pointed = new Set(
    sequences.flatMap(([name, v]) =>
      pointerFor(name, v.t === "arr" ? v.n : v.v.length).map((p) => p.name),
    ),
  );
  const nodePointers = vars
    .filter(([, v]) => v.t === "node")
    .map(([name, v]) => ({ name, id: v.id }));
  const treePointers = vars
    .filter(([, v]) => v.t === "tnode")
    .map(([name, v]) => ({ name, id: v.id }));
  const chains = useMemo(() => {
    const targets = new Set(
      Object.values(snap.nodes)
        .map((n) => n.next)
        .filter(Boolean),
    );
    const heads = Object.keys(snap.nodes)
      .map(Number)
      .filter((id) => !targets.has(id));
    const seen = new Set();
    const out = [];
    for (const head of [...heads, ...Object.keys(snap.nodes).map(Number)]) {
      if (seen.has(head)) continue;
      const ids = [];
      let cur = head;
      while (cur && !seen.has(cur) && ids.length < 300) {
        seen.add(cur);
        ids.push(cur);
        cur = snap.nodes[cur]?.next;
      }
      if (ids.length) out.push(ids);
    }
    return out;
  }, [snap]);
  const roots = useMemo(() => {
    const children = new Set(
      Object.values(snap.tnodes)
        .flatMap((n) => [n.left, n.right])
        .filter(Boolean),
    );
    return Object.keys(snap.tnodes)
      .map(Number)
      .filter((id) => !children.has(id));
  }, [snap]);
  return (
    <div className="dbg-snapshot">
      {sequences.map(([name, v]) => {
        const items =
          v.t === "arr" ? v.v : [...v.v].map((c) => ({ t: "str", v: c }));
        const prevValue = prev?.vars[name];
        const prevItems =
          prevValue?.t === "arr"
            ? prevValue.v
            : prevValue?.t === "str"
              ? [...prevValue.v].map((c) => ({ t: "str", v: c }))
              : null;
        return (
          <div className="dbg-row" key={name}>
            <span className="dbg-name">{name}</span>
            <Cells
              items={items}
              prevItems={prevItems}
              pointers={pointerFor(name, v.t === "arr" ? v.n : v.v.length)}
              total={v.t === "arr" ? v.n : v.v.length}
            />
          </div>
        );
      })}
      {tables.map(([name, v]) => (
        <div className="dbg-row" key={name}>
          <span className="dbg-name">{name}</span>
          <Entries value={v} prev={prev?.vars[name]} />
        </div>
      ))}
      {chains.map((ids) => (
        <div className="dbg-row" key={"chain" + ids[0]}>
          <span className="dbg-name">list</span>
          <Chain
            ids={ids}
            nodes={snap.nodes}
            prevNodes={prev?.nodes}
            pointers={nodePointers}
          />
        </div>
      ))}
      {roots.map((id) => (
        <div className="dbg-row" key={"tree" + id}>
          <span className="dbg-name">tree</span>
          <Tree id={id} nodes={snap.tnodes} pointers={treePointers} />
        </div>
      ))}
      <div className="dbg-scalars">
        {vars
          .filter(
            ([name, v]) =>
              !["arr", "node", "tnode"].includes(v.t) &&
              !isTable(v) &&
              !(v.t === "str" && sequences.some(([n]) => n === name)),
          )
          .map(([name, v]) => (
            <div
              className={"dbg-var " + (pointed.has(name) ? "pointer" : "")}
              key={name}
            >
              <span className="dbg-name">{name}</span>
              <Scalar value={v} prev={prev?.vars[name]} />
            </div>
          ))}
        {snap.ret && (
          <div className="dbg-var returns">
            <span className="dbg-name">return</span>
            <Scalar value={snap.ret} />
          </div>
        )}
      </div>
    </div>
  );
}
const Debugger = forwardRef(function Debugger(
  { suite, language, code, editor, lastRun, onTrace },
  ref,
) {
  const [caseIndex, setCaseIndex] = useState(0),
    [steps, setSteps] = useState([]),
    [cursor, setCursor] = useState(0),
    [status, setStatus] = useState("idle"),
    [result, setResult] = useState(null),
    [playing, setPlaying] = useState(false),
    // "code" traces the editor; "walk" shows Alex's walkthrough of the
    // reference approach, which has captions and no source lines.
    [source, setSource] = useState("code"),
    [walk, setWalk] = useState(null);
  const run = useRef(null),
    follow = useRef(true),
    decorations = useRef([]),
    stepsRef = useRef([]);
  const cases = suite?.cases || [];
  useEffect(() => {
    const failing = lastRun?.results?.findIndex((r) => !r.passed);
    if (failing >= 0 && failing < cases.length) setCaseIndex(failing);
  }, [lastRun]);
  useEffect(() => () => run.current?.stop(), []);
  useEffect(() => {
    if (caseIndex >= cases.length) setCaseIndex(0);
  }, [cases.length]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setCursor((c) => {
        if (c + 1 >= stepsRef.current.length) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 350);
    return () => clearInterval(timer);
  }, [playing]);
  const snap = steps[cursor];
  useEffect(() => {
    if (!editor) return;
    const live = source === "code" && snap;
    decorations.current = editor.deltaDecorations(
      decorations.current,
      live
        ? [
            {
              range: {
                startLineNumber: snap.line,
                startColumn: 1,
                endLineNumber: snap.line,
                endColumn: 1,
              },
              options: {
                isWholeLine: true,
                className: "debug-line",
                linesDecorationsClassName: "debug-line-gutter",
              },
            },
          ]
        : [],
    );
    if (live) editor.revealLineInCenterIfOutsideViewport(snap.line);
  }, [snap, editor, source]);
  // Clear the line highlight when the debugger goes away.
  useEffect(
    () => () => {
      if (editor)
        decorations.current = editor.deltaDecorations(decorations.current, []);
    },
    [editor],
  );
  const show = (list) => {
    stepsRef.current = list;
    setSteps(list);
  };
  // Imperative API for the interviewer backend: trace a case, load a
  // walkthrough, move the cursor.
  useImperativeHandle(ref, () => ({
    caseNames: () => cases.map((c) => c.name || ""),
    async trace(which) {
      const i =
        typeof which === "number"
          ? which - 1
          : cases.findIndex((c) =>
              (c.name || "")
                .toLowerCase()
                .includes(String(which).toLowerCase()),
            );
      if (i < 0 || i >= cases.length) return null;
      setCaseIndex(i);
      return start(i);
    },
    load(walkthrough) {
      run.current?.stop();
      // Drop the traced line's highlight now rather than after the next
      // render, so a walkthrough never shows with a stale line marker.
      if (editor)
        decorations.current = editor.deltaDecorations(decorations.current, []);
      setPlaying(false);
      follow.current = false;
      setSource("walk");
      setWalk(walkthrough);
      show(walkthrough.steps || []);
      setCursor(0);
      setResult(null);
      setStatus("done");
    },
    goTo: (step) => go(step - 1),
  }));
  async function start(which = caseIndex) {
    if (which >= cases.length) which = 0;
    run.current?.stop();
    setSource("code");
    setWalk(null);
    show([]);
    setCursor(0);
    setResult(null);
    setPlaying(false);
    follow.current = true;
    setStatus("running");
    const collected = [];
    run.current = traceCode(code, language, suite, which, (batch) => {
      collected.push(...batch);
      show([...collected]);
      if (follow.current) setCursor(collected.length - 1);
    });
    const outcome = await run.current.done;
    setResult(outcome);
    setStatus("done");
    onTrace?.({ case: cases[which], steps: collected, result: outcome });
    return { case: cases[which], steps: collected, result: outcome };
  }
  function stop() {
    run.current?.stop();
  }
  const go = (index) => {
    follow.current = false;
    setPlaying(false);
    setCursor(Math.max(0, Math.min(stepsRef.current.length - 1, index)));
  };
  const caption = snap?.note ? fillCaption(snap.note, snap.vars) : "";
  return (
    <div className={"debugger " + (source === "walk" ? "walk" : "")}>
      <div className="dbg-toolbar">
        <Bug size={13} />
        <select
          aria-label="Debug test case"
          value={caseIndex}
          onChange={(e) => setCaseIndex(Number(e.target.value))}
          disabled={status === "running"}
        >
          {cases.some((c) => c.own) && (
            <optgroup label="Your testcases">
              {cases.map((c, i) =>
                c.own ? (
                  <option key={i} value={i}>
                    {c.name}
                  </option>
                ) : null,
              )}
            </optgroup>
          )}
          {cases.some((c) => !c.own) && (
            <optgroup label="Prepared">
              {cases.map((c, i) =>
                c.own ? null : (
                  <option key={i} value={i}>
                    {c.name || `case ${i + 1}`}
                  </option>
                ),
              )}
            </optgroup>
          )}
        </select>
        {status === "running" ? (
          <button className="run" onClick={stop}>
            <Square size={11} /> Stop
          </button>
        ) : (
          <button
            className="run"
            onClick={() => start()}
            disabled={!cases.length}
          >
            <Play size={11} /> Trace
          </button>
        )}
        {source === "walk" && walk ? (
          <span className="dbg-walk" title="Alex's walkthrough">
            <Sparkles size={11} />
            {walk.approach || "Reference approach"} · {walk.case?.name}
          </span>
        ) : (
          <span className="dbg-status">
            {status === "running"
              ? `Tracing… ${steps.length} steps`
              : result
                ? result.error
                  ? result.error
                  : result.ok
                    ? `Passed · ${steps.length} steps`
                    : `Failed · ${steps.length} steps`
                : cases.length
                  ? "Pick a case, then Trace."
                  : "Add a testcase with an expected value to trace it."}
          </span>
        )}
        <div className="dbg-steps">
          <button
            aria-label="First step"
            onClick={() => go(0)}
            disabled={!steps.length}
          >
            <SkipBack size={12} />
          </button>
          <button
            aria-label="Previous step"
            onClick={() => go(cursor - 1)}
            disabled={cursor <= 0}
          >
            <ChevronLeft size={12} />
          </button>
          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => {
              follow.current = false;
              setPlaying(!playing);
            }}
            disabled={steps.length < 2}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            aria-label="Next step"
            onClick={() => go(cursor + 1)}
            disabled={cursor >= steps.length - 1}
          >
            <ChevronRight size={12} />
          </button>
          <button
            aria-label="Last step"
            onClick={() => go(steps.length - 1)}
            disabled={!steps.length}
          >
            <SkipForward size={12} />
          </button>
          <input
            type="range"
            aria-label="Step"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={cursor}
            onChange={(e) => go(Number(e.target.value))}
            disabled={!steps.length}
          />
          <span>
            {steps.length
              ? `${cursor + 1} / ${steps.length}` +
                (source === "code" && snap ? ` · line ${snap.line}` : "")
              : "—"}
          </span>
        </div>
      </div>
      <div className="dbg-body">
        {source === "walk" && walk && (
          <p className="dbg-note" aria-live="polite">
            {caption || `Step ${cursor + 1}`}
          </p>
        )}
        {snap ? (
          <Snapshot snap={snap} prev={steps[cursor - 1]} />
        ) : (
          <p className="dbg-empty">
            {status === "running"
              ? "Waiting for the first step…"
              : "No trace yet."}
          </p>
        )}
        {source === "walk" && walk?.result?.error && (
          <pre className="dbg-result failed">{walk.result.error}</pre>
        )}
        {source === "code" && result?.output && (
          <pre className={"dbg-result " + (result.ok ? "" : "failed")}>
            {result.output}
          </pre>
        )}
      </div>
    </div>
  );
});
export default Debugger;
