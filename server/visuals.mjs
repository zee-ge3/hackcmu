// Prepared visuals for probability questions: a setup diagram plus a worked
// solution in steps, each step with whiteboard shapes (100×100 grid, same
// schema as Alex's draw_on_whiteboard). Authored offline into
// data/probability/visuals/<id>.json; validated here so a bad file is
// skipped, never served.
import { readdir, readFile } from "node:fs/promises";
const KINDS = new Set(["box", "circle", "arrow", "line", "label"]);
const MAX_SHAPES = 80;
const MAX_STEPS = 8;
export function validateShapes(list, path) {
  const errors = [];
  if (!Array.isArray(list)) return [`${path}: shapes must be an array`];
  if (list.length > MAX_SHAPES)
    errors.push(`${path}: at most ${MAX_SHAPES} shapes (has ${list.length})`);
  list.forEach((sh, i) => {
    const at = `${path}[${i}]`;
    if (!sh || typeof sh !== "object")
      return errors.push(`${at}: not an object`);
    if (!KINDS.has(sh.kind))
      errors.push(`${at}: kind ${JSON.stringify(sh.kind)}`);
    for (const k of ["x", "y"])
      if (!Number.isFinite(sh[k]) || sh[k] < 0 || sh[k] > 100)
        errors.push(`${at}: ${k} must be 0-100`);
    for (const k of ["w", "h"])
      if (!Number.isFinite(sh[k]) || sh[k] < -100 || sh[k] > 100)
        errors.push(`${at}: ${k} must be -100..100`);
    if (typeof sh.text !== "string" || sh.text.length > 60)
      errors.push(`${at}: text must be a string of at most 60 characters`);
    if (sh.kind === "label" && !(sh.text || "").trim())
      errors.push(`${at}: a label needs text`);
    if ((sh.kind === "box" || sh.kind === "circle") && (sh.w <= 0 || sh.h <= 0))
      errors.push(`${at}: ${sh.kind} needs positive w and h`);
    if (
      Number.isFinite(sh.x) &&
      Number.isFinite(sh.w) &&
      (sh.x + sh.w > 100.5 || sh.x + sh.w < -0.5)
    )
      errors.push(`${at}: runs off the board horizontally`);
    if (
      Number.isFinite(sh.y) &&
      Number.isFinite(sh.h) &&
      (sh.y + sh.h > 100.5 || sh.y + sh.h < -0.5)
    )
      errors.push(`${at}: runs off the board vertically`);
  });
  return errors;
}
export function validateVisual(v) {
  const errors = [];
  if (!v || typeof v !== "object") return ["not an object"];
  if (typeof v.id !== "string" || !v.id) errors.push("id missing");
  if (
    v.answer !== null &&
    v.answer !== undefined &&
    typeof v.answer !== "string"
  )
    errors.push("answer must be a string or null");
  if (v.diagram) {
    if (typeof v.diagram.caption !== "string" || v.diagram.caption.length > 120)
      errors.push("diagram.caption must be a string of at most 120 characters");
    errors.push(...validateShapes(v.diagram.shapes, "diagram.shapes"));
  }
  const steps = Array.isArray(v.steps) ? v.steps : [];
  if (v.steps && !Array.isArray(v.steps)) errors.push("steps must be an array");
  if (steps.length > MAX_STEPS) errors.push(`at most ${MAX_STEPS} steps`);
  steps.forEach((st, i) => {
    if (!st || typeof st !== "object")
      return errors.push(`steps[${i}]: not an object`);
    if (
      typeof st.caption !== "string" ||
      !st.caption.trim() ||
      st.caption.length > 120
    )
      errors.push(`steps[${i}].caption must be 1-120 characters`);
    if (typeof st.text !== "string" || !st.text.trim() || st.text.length > 1500)
      errors.push(`steps[${i}].text must be 1-1500 characters`);
    if (st.shapes !== undefined)
      errors.push(...validateShapes(st.shapes, `steps[${i}].shapes`));
  });
  if (!v.diagram && !steps.length && !v.answer)
    errors.push("nothing to serve: no diagram, steps, or answer");
  return errors;
}
export async function loadVisuals(dir) {
  const byId = new Map();
  const problems = [];
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return { byId, problems };
  }
  for (const file of files) {
    let v;
    try {
      v = JSON.parse(await readFile(new URL(file, dir), "utf8"));
    } catch (e) {
      problems.push(`${file}: ${e.message}`);
      continue;
    }
    const errors = validateVisual(v);
    if (errors.length) {
      problems.push(`${file}: ${errors.join("; ")}`);
      continue;
    }
    byId.set(v.id, {
      id: v.id,
      answer: v.answer || null,
      diagram: v.diagram
        ? { caption: v.diagram.caption, shapes: v.diagram.shapes }
        : null,
      steps: (v.steps || []).map((st) => ({
        caption: st.caption,
        text: st.text,
        shapes: st.shapes || [],
      })),
    });
  }
  return { byId, problems };
}
// What the browser draws for "step k": the diagram plus every step's shapes
// up to k (cumulative), so a step builds on the picture before it.
export function sketchUpTo(visual, step) {
  const shapes = [...(visual.diagram?.shapes || [])];
  for (const st of visual.steps.slice(0, step)) shapes.push(...st.shapes);
  return shapes;
}
// The public summary a room gets before anything is revealed.
export const visualSummary = (visual) =>
  visual
    ? {
        hasDiagram: !!visual.diagram,
        diagramCaption: visual.diagram?.caption || null,
        stepCount: visual.steps.length,
      }
    : { hasDiagram: false, diagramCaption: null, stepCount: 0 };
