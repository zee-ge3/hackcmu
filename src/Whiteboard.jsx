import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  Pencil,
  Eraser,
  Undo2,
  Trash2,
  Type,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { api } from "./api.mjs";
import { shapeStrokes } from "./shapes.mjs";
const Whiteboard = forwardRef(function Whiteboard(
  { base, index, store, onContext, onActivity, disabled = false },
  ref,
) {
  const model = useRef(store),
    canvas = useRef(null),
    draft = useRef(null),
    alive = useRef(true),
    sending = useRef(false),
    flight = useRef(Promise.resolve()),
    timer = useRef(null),
    syncRef = useRef(null),
    contextRef = useRef(onContext),
    disabledRef = useRef(disabled);
  const [revision, setRevision] = useState(store.revision || 0),
    [tool, setTool] = useState("pen"),
    [color, setColor] = useState("#263d2c"),
    [label, setLabel] = useState(""),
    [status, setStatus] = useState(store.summary ? "shared" : "empty"),
    [error, setError] = useState(""),
    [summary, setSummary] = useState(store.summary || "");
  contextRef.current = onContext;
  disabledRef.current = disabled;
  model.current.strokes ??= [];
  function paint() {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fffef8";
    ctx.fillRect(0, 0, c.width, c.height);
    for (const stroke of [
      ...model.current.strokes,
      ...(draft.current ? [draft.current] : []),
    ]) {
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.tool === "eraser" ? 24 : 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (stroke.tool === "text") {
        ctx.font = "24px sans-serif";
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
        continue;
      }
      if (stroke.tool === "eraser") ctx.strokeStyle = "#fffef8";
      ctx.beginPath();
      stroke.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      if (stroke.points.length === 1) {
        ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
      }
      ctx.stroke();
      if (stroke.tool === "arrow" && stroke.points.length > 1) {
        const a = stroke.points[0],
          b = stroke.points.at(-1),
          angle = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.beginPath();
        ctx.moveTo(
          b.x - 16 * Math.cos(angle - 0.45),
          b.y - 16 * Math.sin(angle - 0.45),
        );
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(
          b.x - 16 * Math.cos(angle + 0.45),
          b.y - 16 * Math.sin(angle + 0.45),
        );
        ctx.stroke();
      }
    }
  }
  function changed({ agent = false } = {}) {
    if (!agent) onActivity?.();
    model.current.revision = (model.current.revision || 0) + 1;
    setRevision(model.current.revision);
    setStatus("pending");
    paint();
  }
  function point(event) {
    const rect = canvas.current.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(1200, ((event.clientX - rect.left) * 1200) / rect.width),
      ),
      y: Math.max(
        0,
        Math.min(800, ((event.clientY - rect.top) * 800) / rect.height),
      ),
    };
  }
  function down(e) {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    if (tool === "text") {
      if (label.trim()) {
        model.current.strokes.push({
          tool,
          text: label.trim(),
          color,
          points: [p],
        });
        changed();
      }
      return;
    }
    draft.current = { tool, color, points: [p] };
    paint();
  }
  function move(e) {
    if (!draft.current) return;
    const p = point(e);
    if (draft.current.tool === "arrow")
      draft.current.points = [draft.current.points[0], p];
    else draft.current.points.push(p);
    paint();
  }
  function up() {
    if (!draft.current) return;
    model.current.strokes.push(draft.current);
    draft.current = null;
    changed();
  }
  function sync(force = false) {
    if (sending.current)
      return flight.current.then(() => {
        if (force && model.current.ack !== model.current.revision)
          return sync(true);
      });
    const task = performSync(force);
    flight.current = task;
    return task;
  }
  model.current.flush = () => {
    clearTimeout(timer.current);
    return syncRef.current(true);
  };
  async function performSync(force) {
    if (
      sending.current ||
      !alive.current ||
      (disabledRef.current && !force) ||
      !model.current.revision ||
      model.current.ack === model.current.revision
    )
      return;
    const version = model.current.revision;
    const empty = model.current.strokes.length === 0;
    const image = empty ? undefined : canvas.current.toDataURL("image/png");
    sending.current = true;
    setStatus("sharing");
    setError("");
    try {
      const result = await api(base + "/canvas", {
        index,
        revision: version,
        empty,
        image,
        strokes: model.current.strokes,
      });
      if (!result.stale) {
        model.current.ack = version;
        model.current.summary = result.summary;
      }
      if (
        alive.current &&
        model.current.revision === version &&
        !result.stale
      ) {
        setSummary(result.summary);
        setStatus("shared");
        contextRef.current(result.summary, index);
      }
    } catch (e) {
      if (alive.current) {
        setError(e.message);
        setStatus("error");
      }
      if (force) throw e;
    } finally {
      sending.current = false;
      if (alive.current && model.current.revision !== version) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => syncRef.current(), 1200);
      }
    }
  }
  syncRef.current = sync;
  // Alex's sketch: shapes are added one at a time so the drawing is watched
  // happening, then synced like any other change (without counting as the
  // candidate's activity).
  useImperativeHandle(ref, () => ({
    async addShapes(shapes) {
      if (disabledRef.current) return 0;
      let added = 0;
      for (const shape of shapes) {
        if (!alive.current) break;
        for (const stroke of shapeStrokes(shape)) {
          model.current.strokes.push(stroke);
          added++;
        }
        paint();
        await new Promise((r) => setTimeout(r, 220));
      }
      if (added && alive.current) changed({ agent: true });
      return added;
    },
    // "mine" removes Alex's own strokes; "all" wipes the board (only when the
    // candidate asked). Synced like any other change.
    clear(scope) {
      if (disabledRef.current) return 0;
      const before = model.current.strokes.length;
      model.current.strokes =
        scope === "all"
          ? []
          : model.current.strokes.filter((st) => st.by !== "alex");
      const removed = before - model.current.strokes.length;
      if (removed) changed({ agent: true });
      return removed;
    },
    strokeCount: () => model.current.strokes.length,
  }));
  useEffect(() => {
    paint();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    clearTimeout(timer.current);
    if (revision) timer.current = setTimeout(() => syncRef.current(), 1400);
    return () => clearTimeout(timer.current);
  }, [revision]);
  return (
    <section className="whiteboard">
      <div className="board-toolbar">
        <div className="board-tools">
          {[
            ["pen", Pencil, "Draw"],
            ["arrow", ArrowUpRight, "Arrow"],
            ["text", Type, "Add label"],
            ["eraser", Eraser, "Erase"],
          ].map(([id, Icon, title]) => (
            <button
              key={id}
              aria-label={title}
              title={title}
              className={tool === id ? "active" : ""}
              disabled={disabled}
              onClick={() => setTool(id)}
            >
              <Icon size={16} />
            </button>
          ))}
          <span className="tool-divider" />
          {["#263d2c", "#286ab0", "#bf6348"].map((c) => (
            <button
              key={c}
              aria-label={"Ink " + c}
              className={"ink " + (color === c ? "selected" : "")}
              style={{ "--ink": c }}
              disabled={disabled}
              onClick={() => setColor(c)}
            />
          ))}
          <button
            aria-label="Undo drawing"
            title="Undo"
            disabled={disabled || !model.current.strokes.length}
            onClick={() => {
              model.current.strokes.pop();
              changed();
            }}
          >
            <Undo2 size={16} />
          </button>
          <button
            aria-label="Clear whiteboard"
            title="Clear"
            disabled={disabled || !model.current.strokes.length}
            onClick={() => {
              model.current.strokes = [];
              changed();
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
        {tool === "text" && (
          <input
            className="board-label"
            aria-label="Whiteboard label"
            placeholder="Label, then click the canvas"
            maxLength={120}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        )}
      </div>
      <div className="canvas-space">
        <canvas
          width={1200}
          height={800}
          ref={canvas}
          aria-label="Shared drawing canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <div className="board-status" role="status" data-status={status}>
        <span className="live-dot" />
        {
          {
            empty: "Synced as you draw",
            pending: "Pending",
            sharing: "Syncing…",
            shared: "Synced",
            error: "Not synced",
          }[status]
        }
        {status === "error" && (
          <button onClick={() => syncRef.current()} disabled={disabled}>
            <RefreshCw size={13} />
            Retry
          </button>
        )}
      </div>
      {error && <div className="board-error">{error}</div>}
      {summary && (
        <details className="board-summary">
          <summary>Description</summary>
          <p>{summary}</p>
        </details>
      )}
    </section>
  );
});
export default Whiteboard;
