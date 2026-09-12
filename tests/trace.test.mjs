import test from "node:test";
import assert from "node:assert/strict";
import { instrument, runJavascriptTrace } from "../src/trace.mjs";
import { lineDiff } from "../src/diff.mjs";
const twoSum = {
  method: "twoSum",
  arguments: ["array", "number"],
  output: "array",
  comparison: "exact",
};
test("instrumented two-pointer code streams scoped snapshots and the return value", () => {
  const code = `var twoSum = function(numbers, target) {
  let l = 0, r = numbers.length - 1;
  while (l < r) {
    const sum = numbers[l] + numbers[r];
    if (sum === target) return [l + 1, r + 1];
    if (sum < target) l++; else r--;
  }
  return [];
};`;
  const batches = [];
  const result = runJavascriptTrace(
    code,
    twoSum,
    { name: "example", input: [[2, 7, 11, 15], 9], expected: [1, 2] },
    { onSteps: (s) => batches.push(s), batch: 3 },
  );
  const steps = batches.flat();
  assert.equal(result.ok, true);
  assert.equal(result.steps, steps.length);
  assert.ok(steps.length > 3);
  assert.deepEqual(Object.keys(steps[0].vars), ["twoSum", "numbers", "target"]);
  assert.equal(steps[0].vars.numbers.t, "arr");
  const inLoop = steps.find((s) => s.line === 4);
  assert.equal(inLoop.vars.l.v, 0);
  assert.equal(inLoop.vars.r.v, 3);
  assert.equal(steps.at(-1).ret.t, "arr");
});
test("tracing never captures a block-scoped name before its declaration", () => {
  const code = `function f(n){ let a = 1; { let a = 2; n += a; } return n + a; }`;
  const steps = [];
  const result = runJavascriptTrace(
    code,
    {
      method: "f",
      arguments: ["number"],
      output: "number",
      comparison: "exact",
    },
    { input: [1], expected: 4 },
    { onSteps: (s) => steps.push(...s) },
  );
  assert.equal(result.error, undefined, result.error);
  assert.equal(result.ok, true);
  // The snapshot taken inside the block before `let a = 2` must not read either `a`.
  const src = instrument(code);
  assert.match(src, /\{\s*__t\(1, \(\) => \(\{n\}\)\);\s*let a = 2;/);
});
test("linked list snapshots carry node identity and relinking", () => {
  const code = `function reverseList(head){ let prev = null, cur = head; while (cur) { const next = cur.next; cur.next = prev; prev = cur; cur = next; } return prev; }`;
  const steps = [];
  const result = runJavascriptTrace(
    code,
    {
      method: "reverseList",
      arguments: ["list"],
      output: "list",
      comparison: "exact",
    },
    { input: [[1, 2, 3]], expected: [3, 2, 1] },
    { onSteps: (s) => steps.push(...s) },
  );
  assert.equal(result.ok, true);
  const first = steps[0];
  assert.equal(first.vars.head.t, "node");
  assert.equal(first.nodes[first.vars.head.id].next, first.vars.head.id + 1);
  const last = steps.at(-1);
  assert.equal(
    last.nodes[first.vars.head.id].next,
    null,
    "head now ends the list",
  );
});
test("runaway loops stop at the step limit with a readable error", () => {
  const steps = [];
  const result = runJavascriptTrace(
    `function f(n){ while (true) { n++; } }`,
    {
      method: "f",
      arguments: ["number"],
      output: "number",
      comparison: "exact",
    },
    { input: [0], expected: 0 },
    { onSteps: (s) => steps.push(...s), limit: 50 },
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /50 steps/);
  assert.equal(steps.length, 50);
});
test("line diff reports lines an edit added", () => {
  assert.deepEqual(lineDiff("a\nb\nc", "a\nx\nb\nc\ny").added, [2, 5]);
  assert.deepEqual(lineDiff("a\nb", "a").removed, [2]);
});
test("labeled loops, shadowed bindings, and brace-less bodies trace correctly", () => {
  const spec = {
    method: "f",
    arguments: ["json"],
    output: "json",
    comparison: "exact",
  };
  const labeled = `function f(n){ let hits = 0; outer: for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) { if (j === 1) continue outer; hits++; } } return hits; }`;
  const r1 = runJavascriptTrace(
    labeled,
    spec,
    { input: [3], expected: 3 },
    { onSteps: () => {} },
  );
  assert.equal(r1.error, undefined, r1.error);
  assert.equal(r1.ok, true);
  const shadow = `function f(n){ const a = 1; if (n > 0) { const a = 5; const b = a + 1; return b + a; } return a; }`;
  const r2 = runJavascriptTrace(
    shadow,
    spec,
    { input: [1], expected: 11 },
    { onSteps: () => {} },
  );
  assert.equal(r2.error, undefined, r2.error);
  assert.equal(r2.ok, true);
  const cases = `function f(n){ switch (n) { case 1: { const x = 10; return x; } case 2: return n * 2; default: return 0; } }`;
  const r3 = runJavascriptTrace(
    cases,
    spec,
    { input: [2], expected: 4 },
    { onSteps: () => {} },
  );
  assert.equal(r3.error, undefined, r3.error);
  const braceless = `function f(n){ let c = 0; for (let i = 0; i < n; i++) if (i % 2) c++\n c += 10; return c; }`;
  const r4 = runJavascriptTrace(
    braceless,
    spec,
    { input: [4], expected: 12 },
    { onSteps: () => {} },
  );
  assert.equal(r4.error, undefined, r4.error);
  assert.equal(r4.ok, true);
});
test("hoisted helpers read enclosing let/const through a guard instead of crashing", () => {
  const code = `function f(n){ const total = helper(n); let bonus = 5; return total + bonus; function helper(k){ let acc = 0; for (let i = 0; i < k; i++) acc += i; return acc; } }`;
  const r = runJavascriptTrace(
    code,
    { method: "f", arguments: ["json"], output: "json", comparison: "exact" },
    { input: [4], expected: 11 },
    { onSteps: () => {} },
  );
  assert.equal(r.error, undefined, r.error);
  assert.equal(r.ok, true);
});
