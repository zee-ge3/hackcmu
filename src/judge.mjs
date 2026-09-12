export function ListNode(val = 0, next = null) {
  this.val = val;
  this.next = next;
}
export function TreeNode(val = 0, left = null, right = null) {
  this.val = val;
  this.left = left;
  this.right = right;
}
export function decode(value, type) {
  if (type === "list") {
    if (!Array.isArray(value)) return null;
    let head = null;
    for (let i = value.length - 1; i >= 0; i--)
      head = new ListNode(value[i], head);
    return head;
  }
  if (type === "tree") {
    if (!Array.isArray(value) || !value.length || value[0] === null)
      return null;
    const root = new TreeNode(value[0]),
      queue = [root];
    let i = 1;
    for (let cursor = 0; cursor < queue.length && i < value.length; cursor++)
      for (const side of ["left", "right"]) {
        if (i < value.length && value[i] !== null) {
          queue[cursor][side] = new TreeNode(value[i]);
          queue.push(queue[cursor][side]);
        }
        i++;
      }
    return root;
  }
  return structuredClone(value);
}
export function encode(value, type) {
  if (type === "list") {
    if (value && typeof value !== "object")
      throw new Error(`Return a ListNode (or null), not ${typeof value}.`);
    if (value && !("val" in value && "next" in value))
      throw new Error("Return a ListNode (or null), not a plain value.");
    const out = [],
      seen = new Set();
    while (value) {
      if (seen.has(value) || out.length > 10000)
        throw new Error(
          "Returned linked list contains a cycle or is too large.",
        );
      seen.add(value);
      out.push(value.val);
      value = value.next;
    }
    return out;
  }
  if (type === "tree") {
    if (!value) return [];
    if (typeof value !== "object" || !("val" in value && "left" in value))
      throw new Error("Return a TreeNode (or null), not a plain value.");
    const out = [],
      queue = [value],
      seen = new Set();
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      if (!node) {
        out.push(null);
        continue;
      }
      if (seen.has(node) || queue.length > 20000)
        throw new Error("Returned tree contains a cycle or is too large.");
      seen.add(node);
      out.push(node.val);
      queue.push(node.left, node.right);
    }
    while (out.at(-1) === null) out.pop();
    return out;
  }
  return value;
}
// JSON with the values JSON would otherwise lose or conflate: non-finite
// numbers, bigints, functions, undefined, and cycles.
export function safeValue(value) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (typeof v === "bigint") return `${v}n`;
    if (typeof v === "function") return "[function]";
    if (typeof v === "number" && !Number.isFinite(v)) return String(v);
    if (v === undefined) return undefined;
    if (!v || typeof v !== "object") return v;
    if (seen.has(v)) return "[cycle]";
    seen.add(v);
    if (v instanceof Map) return walk([...v]);
    if (v instanceof Set) return walk([...v]);
    if (Array.isArray(v))
      return Array.from(v, (x) => (x === undefined ? null : walk(x)));
    const out = {};
    for (const [k, x] of Object.entries(v))
      if (x !== undefined) out[k] = walk(x);
    return out;
  };
  return walk(value);
}
const stable = (v) =>
  JSON.stringify(v, (_k, x) =>
    typeof x === "number" && !Number.isFinite(x)
      ? String(x)
      : typeof x === "bigint"
        ? `${x}n`
        : x === undefined
          ? "__undefined__"
          : x,
  );
export function matches(actual, expected, comparison = "exact") {
  const normalize = (value) => {
    if (!Array.isArray(value)) return value;
    if (comparison === "triplets")
      return value
        .map((row) =>
          Array.isArray(row) ? [...row].sort((a, b) => a - b) : row,
        )
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (comparison === "unordered")
      return [...value].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b)),
      );
    return value;
  };
  return stable(normalize(actual)) === stable(normalize(expected));
}
export function invokeJavascript(code, suite, inputs, consoleObject = console) {
  if (!/^[A-Za-z_$][\w$]*$/.test(suite.method))
    throw new Error("Invalid suite entry point");
  const args = inputs.map((x, i) => decode(x, suite.arguments[i]));
  const fn = new Function(
    "ListNode",
    "TreeNode",
    "console",
    `${code}\n;return typeof ${suite.method} === 'function' ? ${suite.method} : null;`,
  )(ListNode, TreeNode, consoleObject);
  if (!fn)
    throw new Error(`Define ${suite.method} using the supplied starter code.`);
  const result = fn(...args);
  if (suite.output.startsWith("argument:")) {
    const i = Number(suite.output.split(":")[1]);
    return encode(args[i], suite.arguments[i]);
  }
  return encode(result, suite.output);
}
export function summarize(suite, results) {
  const passed = results.filter((r) => r.passed).length;
  const failures = results.filter((r) => r.passed === false);
  const ungraded = results.filter((r) => r.passed === null);
  const preview = (v) => {
    const text = JSON.stringify(v);
    return text === undefined
      ? "undefined"
      : text.length > 350
        ? text.slice(0, 350) + "…"
        : text;
  };
  return {
    ok: !failures.length,
    suiteVersion: suite.version,
    passed,
    total: results.length - ungraded.length,
    results,
    output:
      (suite.custom
        ? `${passed}/${results.length - ungraded.length} testcases passed${ungraded.length ? ` · ${ungraded.length} without expected output` : ""}\n` +
          ungraded
            .map(
              (r) =>
                `${r.name}: input ${preview(r.input)} → output ${preview(r.actual)}`,
            )
            .join("\n") +
          (ungraded.length ? "\n" : "")
        : `${passed}/${results.length} tests passed · suite v${suite.version}\n`) +
      (failures.length
        ? failures
            .slice(0, 8)
            .map(
              (r) =>
                `\nFAIL ${r.name}\nInput: ${preview(r.input)}\nExpected: ${preview(r.expected)}\n${r.error ? "Error: " + r.error : "Received: " + preview(r.actual)}`,
            )
            .join("\n") +
          (failures.length > 8
            ? `\n\n${failures.length - 8} more failures.`
            : "")
        : suite.custom
          ? ""
          : "All prepared example and edge-case tests passed. These tests do not prove correctness for every possible input."),
  };
}
export function runJavascriptSuite(code, suite, consoleObject = console) {
  const results = suite.cases.map((c) => {
    try {
      const actual = safeValue(
        invokeJavascript(code, suite, c.input, consoleObject),
      );
      return {
        ...c,
        actual,
        passed:
          "expected" in c
            ? matches(actual, c.expected, suite.comparison)
            : null,
      };
    } catch (e) {
      return { ...c, passed: false, error: e.message };
    }
  });
  return summarize(suite, results);
}
