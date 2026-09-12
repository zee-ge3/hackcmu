import { parse } from "acorn";
import { decode, encode, matches, safeValue } from "./judge.mjs";

// Names bound by a declaration pattern (`const {a, b: [c]} = …` → a, c).
function patternNames(node, out = []) {
  if (!node) return out;
  switch (node.type) {
    case "Identifier":
      out.push(node.name);
      break;
    case "ObjectPattern":
      for (const p of node.properties)
        patternNames(p.type === "RestElement" ? p.argument : p.value, out);
      break;
    case "ArrayPattern":
      for (const e of node.elements) patternNames(e, out);
      break;
    case "RestElement":
      patternNames(node.argument, out);
      break;
    case "AssignmentPattern":
      patternNames(node.left, out);
      break;
  }
  return out;
}
const isFunction = (n) =>
  n &&
  [
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
  ].includes(n.type);
function children(node) {
  const out = [];
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "type") continue;
    const v = node[key];
    if (Array.isArray(v))
      for (const x of v) x && typeof x.type === "string" && out.push(x);
    else if (v && typeof v.type === "string") out.push(v);
  }
  return out;
}

// Rewrites candidate code so `__t(line, () => ({…visible variables}))` runs before
// every statement inside functions, and `return x` reports its value. Block-scoped
// names are only captured once their declaration precedes the statement, so the
// snapshot thunk never trips the temporal dead zone.
export function instrument(code, tracer = "__t") {
  const ast = parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
  });
  const edits = [];
  // Innermost declaration of a name decides: if the nearest scope declares it
  // later than `pos`, the outer binding is shadowed and reading it would hit
  // the temporal dead zone, so the name is left out entirely.
  const visible = (scopes, pos) => {
    const decided = new Map();
    for (let i = scopes.length - 1; i >= 0; i--)
      for (const v of scopes[i])
        if (!decided.has(v.name))
          decided.set(v.name, v.hoisted || v.end <= pos);
    decided.delete(tracer);
    decided.delete("arguments");
    // Outer-to-inner order keeps snapshots stable for the visualizer. Names
    // from outside the current function that are not hoisted may still be in
    // their temporal dead zone when a hoisted function runs early, so they are
    // read through a guard.
    const fnBoundary = scopes.map((sc) => !!sc.fn).lastIndexOf(true);
    const names = [];
    scopes.forEach((scope, i) => {
      for (const v of scope)
        if (decided.get(v.name) && !names.some((n) => n.name === v.name))
          names.push({ name: v.name, guarded: i < fnBoundary && !v.hoisted });
    });
    return names;
  };
  const thunk = (scopes, pos) => {
    const names = visible(scopes, pos);
    return `() => ({${names
      .map((n) =>
        n.guarded
          ? `${n.name}: (() => { try { return ${n.name}; } catch { return undefined; } })()`
          : n.name,
      )
      .join(", ")}})`;
  };
  const call = (node, scopes) =>
    `${tracer}(${node.loc.start.line}, ${thunk(scopes, node.start)});`;
  function hoisted(body, scope) {
    const visit = (n) => {
      if (!n || isFunction(n)) return;
      if (n.type === "VariableDeclaration" && n.kind === "var")
        for (const d of n.declarations)
          for (const name of patternNames(d.id))
            scope.push({ name, hoisted: true, end: 0 });
      if (n.type === "FunctionDeclaration" && n.id)
        scope.push({ name: n.id.name, hoisted: true, end: 0 });
      for (const c of children(n)) visit(c);
    };
    for (const c of children(body)) visit(c);
    if (body.type === "FunctionDeclaration" && body.id) {
      // handled by the enclosing scope
    }
  }
  function visitFunction(fn, scopes) {
    const scope = [];
    scope.fn = true;
    for (const p of fn.params)
      for (const name of patternNames(p))
        scope.push({ name, hoisted: true, end: 0 });
    const inner = [...scopes, scope];
    if (fn.body.type === "BlockStatement") {
      hoisted(fn.body, scope);
      visitBlock(fn.body, inner);
    } else visitExpression(fn.body, inner);
  }
  function visitExpression(node, scopes) {
    if (!node) return;
    if (isFunction(node)) return visitFunction(node, scopes);
    for (const c of children(node)) visitExpression(c, scopes);
  }
  function visitBlock(block, scopes) {
    visitStatements(block.body, [...scopes, []]);
  }
  function visitStatements(list, scopes) {
    const scope = scopes.at(-1);
    // Block-scoped names are known from block entry so that an outer binding
    // they shadow is never captured before the inner declaration runs.
    for (const stmt of list) {
      if (stmt.type === "VariableDeclaration" && stmt.kind !== "var")
        for (const d of stmt.declarations)
          for (const name of patternNames(d.id))
            scope.push({ name, hoisted: false, end: stmt.end });
      else if (stmt.type === "ClassDeclaration" && stmt.id)
        scope.push({ name: stmt.id.name, hoisted: false, end: stmt.end });
    }
    for (const stmt of list) visitStatement(stmt, scopes, scope, true);
  }
  // `wrap` is false when the statement is the lone body of if/for/while without
  // braces; then the tracer call is added together with surrounding braces.
  function visitStatement(stmt, scopes, scope, inList, noTrace = false) {
    const skip =
      noTrace ||
      ["FunctionDeclaration", "ClassDeclaration", "EmptyStatement"].includes(
        stmt.type,
      );
    if (!skip && stmt.type !== "ReturnStatement") {
      if (inList) edits.push({ pos: stmt.start, text: call(stmt, scopes) });
      else {
        edits.push({ pos: stmt.start, text: "{" + call(stmt, scopes) });
        edits.push({ pos: stmt.end, text: "}", closer: true });
      }
    }
    switch (stmt.type) {
      case "ReturnStatement": {
        const t = thunk(scopes, stmt.start);
        const line = stmt.loc.start.line;
        if (stmt.argument) {
          edits.push({
            pos: stmt.argument.start,
            text: `${tracer}.r(${line}, ${t}, (`,
          });
          edits.push({ pos: stmt.argument.end, text: "))" });
          visitExpression(stmt.argument, scopes);
        } else
          edits.push({
            pos: stmt.start + 6,
            text: ` ${tracer}.r(${line}, ${t}, undefined)`,
          });
        if (!inList) {
          edits.push({ pos: stmt.start, text: "{" });
          edits.push({ pos: stmt.end, text: "}", closer: true });
        }
        break;
      }
      case "VariableDeclaration":
        for (const d of stmt.declarations) visitExpression(d.init, scopes);
        if (stmt.kind !== "var")
          for (const d of stmt.declarations)
            for (const name of patternNames(d.id))
              if (!scope.some((v) => v.name === name && v.end === stmt.end))
                scope.push({ name, hoisted: false, end: stmt.end });
        break;
      case "FunctionDeclaration":
        visitFunction(stmt, scopes);
        break;
      case "BlockStatement":
        visitBlock(stmt, scopes);
        break;
      case "IfStatement":
        visitExpression(stmt.test, scopes);
        visitSingle(stmt.consequent, scopes);
        if (stmt.alternate) visitSingle(stmt.alternate, scopes);
        break;
      case "ForStatement": {
        const loop = [];
        const inner = [...scopes, loop];
        if (stmt.init) {
          if (stmt.init.type === "VariableDeclaration") {
            for (const d of stmt.init.declarations)
              visitExpression(d.init, inner);
            for (const d of stmt.init.declarations)
              for (const name of patternNames(d.id))
                loop.push({
                  name,
                  hoisted: stmt.init.kind === "var",
                  end: stmt.init.end,
                });
          } else visitExpression(stmt.init, inner);
        }
        visitExpression(stmt.test, inner);
        visitExpression(stmt.update, inner);
        visitSingle(stmt.body, inner);
        break;
      }
      case "ForInStatement":
      case "ForOfStatement": {
        const loop = [];
        const inner = [...scopes, loop];
        if (stmt.left.type === "VariableDeclaration")
          for (const d of stmt.left.declarations)
            for (const name of patternNames(d.id))
              loop.push({
                name,
                hoisted: stmt.left.kind === "var",
                end: stmt.left.end,
              });
        visitExpression(stmt.right, inner);
        visitSingle(stmt.body, inner);
        break;
      }
      case "WhileStatement":
      case "DoWhileStatement":
        visitExpression(stmt.test, scopes);
        visitSingle(stmt.body, scopes);
        break;
      case "TryStatement":
        visitBlock(stmt.block, scopes);
        if (stmt.handler) {
          const catchScope = [];
          if (stmt.handler.param)
            for (const name of patternNames(stmt.handler.param))
              catchScope.push({ name, hoisted: true, end: 0 });
          visitBlock(stmt.handler.body, [...scopes, catchScope]);
        }
        if (stmt.finalizer) visitBlock(stmt.finalizer, scopes);
        break;
      case "SwitchStatement": {
        visitExpression(stmt.discriminant, scopes);
        for (const c of stmt.cases) {
          visitExpression(c.test, scopes);
          visitStatements(c.consequent, [...scopes, []]);
        }
        break;
      }
      case "LabeledStatement":
        // The tracer call already precedes the label; the loop itself must
        // stay directly under the label for `break`/`continue label` to work.
        visitStatement(stmt.body, scopes, scope, true, true);
        break;
      default:
        visitExpression(stmt, scopes);
    }
  }
  function visitSingle(stmt, scopes) {
    if (stmt.type === "BlockStatement") return visitBlock(stmt, scopes);
    const scope = [];
    visitStatement(stmt, [...scopes, scope], scope, false);
  }
  const program = [];
  hoisted(ast, program);
  for (const stmt of ast.body) {
    if (stmt.type === "FunctionDeclaration") visitFunction(stmt, [program]);
    else visitExpression(stmt, [program]);
    if (stmt.type === "VariableDeclaration" && stmt.kind !== "var")
      for (const d of stmt.declarations)
        for (const name of patternNames(d.id))
          program.push({ name, hoisted: true, end: 0 });
  }
  // Later positions first; at the same position a closing brace must end up
  // before the next statement's tracer call, so it is inserted last.
  edits.sort(
    (a, b) => b.pos - a.pos || (a.closer ? 1 : 0) - (b.closer ? 1 : 0),
  );
  let out = code;
  for (const e of edits) out = out.slice(0, e.pos) + e.text + out.slice(e.pos);
  return out;
}

const isNode = (v) =>
  v && typeof v === "object" && "val" in v && "next" in v && !("left" in v);
const isTreeNode = (v) =>
  v && typeof v === "object" && "val" in v && "left" in v && "right" in v;

// Snapshots share node ids across the whole trace (WeakMap identity) so the
// visualizer can follow one pointer through consecutive steps.
export function createSerializer() {
  const ids = new WeakMap();
  let next = 0;
  const idOf = (o) => {
    if (!ids.has(o)) ids.set(o, ++next);
    return ids.get(o);
  };
  const prim = (v) =>
    v === null
      ? null
      : typeof v === "object"
        ? Array.isArray(v)
          ? "[…]"
          : "{…}"
        : typeof v === "bigint"
          ? String(v)
          : v;
  return function serialize(value, snap, depth = 0) {
    if (value === null) return { t: "null" };
    if (value === undefined) return { t: "undef" };
    const type = typeof value;
    if (type === "number" || type === "string" || type === "boolean")
      return {
        t: type === "number" ? "num" : type === "string" ? "str" : "bool",
        v: value,
      };
    if (type === "bigint") return { t: "num", v: String(value) };
    if (type === "function") return { t: "fn", v: value.name || "fn" };
    if (type !== "object") return { t: "str", v: String(value) };
    if (isNode(value)) {
      let cur = value,
        n = 0;
      while (cur && isNode(cur) && n < 300) {
        const id = idOf(cur);
        if (snap.nodes[id]) break;
        snap.nodes[id] = {
          val: prim(cur.val),
          next: cur.next && isNode(cur.next) ? idOf(cur.next) : null,
        };
        cur = cur.next;
        n++;
      }
      return { t: "node", id: idOf(value) };
    }
    if (isTreeNode(value)) {
      const queue = [value];
      for (let i = 0; i < queue.length && i < 200; i++) {
        const node = queue[i];
        const id = idOf(node);
        if (snap.tnodes[id]) continue;
        snap.tnodes[id] = {
          val: prim(node.val),
          left: isTreeNode(node.left) ? idOf(node.left) : null,
          right: isTreeNode(node.right) ? idOf(node.right) : null,
        };
        if (isTreeNode(node.left)) queue.push(node.left);
        if (isTreeNode(node.right)) queue.push(node.right);
      }
      return { t: "tnode", id: idOf(value) };
    }
    const deeper = (x) =>
      depth < 2 ? serialize(x, snap, depth + 1) : { t: "more" };
    if (Array.isArray(value))
      return { t: "arr", v: value.slice(0, 120).map(deeper), n: value.length };
    if (value instanceof Map)
      return {
        t: "map",
        v: [...value].slice(0, 60).map(([k, x]) => [deeper(k), deeper(x)]),
        n: value.size,
      };
    if (value instanceof Set)
      return {
        t: "set",
        v: [...value].slice(0, 60).map(deeper),
        n: value.size,
      };
    const entries = Object.entries(value).slice(0, 40);
    return {
      t: "obj",
      v: Object.fromEntries(entries.map(([k, x]) => [k, deeper(x)])),
    };
  };
}

export class TraceLimit extends Error {
  constructor(limit) {
    super(
      `Debugger stopped after ${limit} steps. Narrow the input or fix the loop.`,
    );
  }
}

export function createTracer({ limit = 2500, onSteps, batch = 25 }) {
  const serialize = createSerializer();
  let pending = [],
    count = 0;
  const flush = () => {
    if (pending.length) onSteps(pending);
    pending = [];
  };
  const record = (line, vars, extra) => {
    if (count >= limit) {
      flush();
      throw new TraceLimit(limit);
    }
    count++;
    const snap = { line, vars: {}, nodes: {}, tnodes: {} };
    for (const [name, value] of Object.entries(vars))
      snap.vars[name] = serialize(value, snap);
    if (extra) snap.ret = serialize(extra.value, snap);
    pending.push(snap);
    if (pending.length >= batch) flush();
  };
  const t = (line, thunk) => record(line, thunk());
  t.r = (line, thunk, value) => {
    record(line, thunk(), { value });
    return value;
  };
  t.flush = flush;
  t.count = () => count;
  return t;
}

export function runJavascriptTrace(
  code,
  suite,
  testCase,
  { onSteps, consoleObject = console, limit } = {},
) {
  if (!/^[A-Za-z_$][\w$]*$/.test(suite.method))
    throw new Error("Invalid suite entry point");
  const tracer = createTracer({ onSteps, limit });
  const { ListNode, TreeNode } = judgeClasses();
  try {
    const source = instrument(code);
    const args = testCase.input.map((x, i) => decode(x, suite.arguments[i]));
    const fn = new Function(
      "ListNode",
      "TreeNode",
      "console",
      "__t",
      `${source}\n;return typeof ${suite.method} === 'function' ? ${suite.method} : null;`,
    )(ListNode, TreeNode, consoleObject, tracer);
    if (!fn)
      throw new Error(
        `Define ${suite.method} using the supplied starter code.`,
      );
    const result = fn(...args);
    const argIndex = suite.output.startsWith("argument:")
      ? Number(suite.output.split(":")[1])
      : -1;
    const actual = safeValue(
      argIndex >= 0
        ? encode(args[argIndex], suite.arguments[argIndex])
        : encode(result, suite.output),
    );
    tracer.flush();
    return {
      ok: matches(actual, testCase.expected, suite.comparison),
      steps: tracer.count(),
      actual,
      expected: testCase.expected,
    };
  } catch (e) {
    tracer.flush();
    return {
      ok: false,
      steps: tracer.count(),
      error: e.message,
      expected: testCase.expected,
    };
  }
}
import * as judge from "./judge.mjs";
const judgeClasses = () => ({
  ListNode: judge.ListNode,
  TreeNode: judge.TreeNode,
});
