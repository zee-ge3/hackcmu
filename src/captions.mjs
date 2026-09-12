// Shared by the server (agent summaries) and the Debugger (walkthrough
// captions): a short text for a serialized trace value, and caption
// templates where `{name}` shows a variable's value at that step.
export function briefValue(v) {
  if (!v) return "";
  switch (v.t) {
    case "null":
      return "null";
    case "undef":
      return "undefined";
    case "str":
      return JSON.stringify(v.v);
    case "num":
    case "bool":
      return String(v.v);
    case "fn":
      return `ƒ ${v.v}`;
    case "node":
      return `node#${v.id}`;
    case "tnode":
      return `tree#${v.id}`;
    case "arr":
      return `[${v.v.map(briefValue).join(", ")}${v.n > v.v.length ? ", …" : ""}]`;
    case "set":
      return `{${v.v.map(briefValue).join(", ")}}`;
    case "map":
      return `{${v.v.map(([k, x]) => `${briefValue(k)}: ${briefValue(x)}`).join(", ")}}`;
    case "obj":
      return `{${Object.entries(v.v)
        .map(([k, x]) => `${k}: ${briefValue(x)}`)
        .join(", ")}}`;
    default:
      return "…";
  }
}
export function fillCaption(note, vars = {}) {
  if (!note) return "";
  return note.replace(/\{([A-Za-z_$][\w$]*)\}/g, (m, name) =>
    name in vars ? briefValue(vars[name]).slice(0, 60) : m,
  );
}
