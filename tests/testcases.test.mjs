import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deriveSpec,
  testSpecFor,
  buildCustomSuite,
  seedCases,
  exampleOutputs,
} from "../src/domain.mjs";
import { runJavascriptSuite, summarize } from "../src/judge.mjs";
const detail = (slug) =>
  JSON.parse(
    readFileSync(new URL(`../data/details/${slug}.json`, import.meta.url)),
  );
const suiteOf = (slug) =>
  JSON.parse(
    readFileSync(new URL(`../data/test-suites/${slug}.json`, import.meta.url)),
  );
test("metaData becomes a callable spec, including in-place and node signatures", () => {
  const twoSum = deriveSpec(detail("two-sum").metaData);
  assert.equal(twoSum.method, "twoSum");
  assert.deepEqual(
    twoSum.params.map((p) => p.name),
    ["nums", "target"],
  );
  assert.equal(twoSum.output, "json");
  const moveZeroes = deriveSpec(detail("move-zeroes").metaData);
  assert.equal(moveZeroes.output, "argument:0");
  assert.deepEqual(
    deriveSpec(detail("reverse-linked-list").metaData).arguments,
    ["list"],
  );
  assert.equal(
    deriveSpec(detail("invert-binary-tree").metaData).output,
    "tree",
  );
  assert.equal(
    deriveSpec(detail("stock-price-fluctuation").metaData),
    null,
    "class design",
  );
  assert.equal(deriveSpec("not json"), null);
  assert.equal(
    deriveSpec(
      JSON.stringify({
        name: "f",
        params: [{ name: "a", type: "integer" }],
        return: { type: "void" },
      }),
    ),
    null,
    "void without output param",
  );
});
test("prepared suites keep their comparison rule but borrow parameter names", () => {
  const spec = testSpecFor(suiteOf("two-sum"), detail("two-sum").metaData);
  assert.equal(spec.comparison, "unordered");
  assert.equal(spec.params[1].name, "target");
  assert.equal(spec.derived, false);
});
test("candidate cases parse JSON per parameter and treat expected as optional", () => {
  const spec = testSpecFor(suiteOf("two-sum"), detail("two-sum").metaData);
  const { suite, invalid } = buildCustomSuite(spec, [
    { id: "a", input: ["[2,7]", "9"], expected: "" },
    { id: "b", input: ["[2,7]", "9"], expected: "[0,1]" },
    { id: "c", input: ["[2,7", "9"], expected: "" },
    { id: "d", input: ["[2,7]"], expected: "" },
    { id: "e", input: ["[2,7]", "9"], expected: "nope" },
  ]);
  assert.equal(suite.cases.length, 2);
  assert.equal("expected" in suite.cases[0], false);
  assert.deepEqual(suite.cases[1].expected, [0, 1]);
  assert.deepEqual(
    invalid.map((p) => p.index),
    [2, 3, 4],
  );
  assert.match(invalid[0].error, /nums/);
  const code =
    "function twoSum(nums, target){ for (let i=0;i<nums.length;i++) for (let j=i+1;j<nums.length;j++) if (nums[i]+nums[j]===target) return [i,j]; return []; }";
  const result = runJavascriptSuite(code, suite);
  assert.equal(
    result.results[0].passed,
    null,
    "no expected → shown, not graded",
  );
  assert.equal(result.results[1].passed, true);
  assert.equal(result.ok, true);
  assert.match(
    result.output,
    /1\/1 testcases passed · 1 without expected output/,
  );
  assert.match(result.output, /output \[0,1\]/);
});
test("statement examples seed the panel with inputs and expected output", () => {
  const q = detail("two-sum");
  const content = String(q.content);
  assert.deepEqual(exampleOutputs(content).slice(0, 2), ["[0,1]", "[1,2]"]);
  const spec = testSpecFor(suiteOf("two-sum"), q.metaData);
  const cases = seedCases({ ...q, content }, spec, suiteOf("two-sum"));
  assert.equal(cases.length, 3);
  assert.deepEqual(cases[0].input, ["[2,7,11,15]", "9"]);
  assert.equal(cases[0].expected, "[0,1]");
  assert.ok(cases.every((c) => c.id.startsWith("example-")));
  assert.deepEqual(
    seedCases({ exampleTestcaseList: ["[1]\n2\n3"], content: "" }, spec, null),
    [],
    "arity mismatch skipped",
  );
});
test("summaries never count ungraded cases as failures", () => {
  const out = summarize({ custom: true, version: 0 }, [
    { name: "Case 1", input: [[1]], actual: 1, passed: null },
    { name: "Case 2", input: [[2]], actual: 2, expected: 3, passed: false },
  ]);
  assert.equal(out.ok, false);
  assert.equal(out.total, 1);
  assert.match(out.output, /0\/1 testcases passed · 1 without expected output/);
  assert.match(out.output, /FAIL Case 2/);
});
import { resolveRunMode, verdict } from "../src/domain.mjs";
test("Run and Submit degrade one step when a suite or signature is missing", () => {
  assert.deepEqual(
    resolveRunMode("submit", { hasSuite: true, hasSpec: true }),
    { mode: "submit", fallback: false },
  );
  assert.deepEqual(
    resolveRunMode("submit", { hasSuite: false, hasSpec: true }),
    { mode: "run", fallback: true },
  );
  assert.deepEqual(resolveRunMode("run", { hasSuite: false, hasSpec: false }), {
    mode: "scratchpad",
    fallback: true,
  });
  assert.deepEqual(
    resolveRunMode("submit", { hasSuite: false, hasSpec: false }),
    { mode: "scratchpad", fallback: true },
  );
  assert.deepEqual(
    resolveRunMode("scratchpad", { hasSuite: true, hasSpec: true }),
    { mode: "scratchpad", fallback: false },
  );
});
test("verdicts follow LeetCode wording for every result shape", () => {
  const label = (r) => verdict(r).label;
  assert.equal(label({ kind: "run", results: [{ passed: true }] }), "Accepted");
  assert.equal(
    label({ kind: "run", results: [{ passed: true }, { passed: false }] }),
    "Wrong Answer",
  );
  assert.equal(
    label({ kind: "run", results: [{ passed: false, error: "boom" }] }),
    "Runtime Error",
  );
  assert.equal(label({ kind: "run", results: [{ passed: null }] }), "Finished");
  assert.equal(label({ kind: "run", results: [] }), "No testcases");
  assert.equal(
    label({
      kind: "run",
      ok: false,
      output: "Execution timed out (15 seconds).",
    }),
    "Time Limit Exceeded",
  );
  assert.equal(
    label({ kind: "submit", ok: false, output: "worker crashed" }),
    "Runtime Error",
  );
  assert.equal(
    label({ kind: "scratchpad", ok: true, output: "6" }),
    "Finished",
  );
  assert.equal(label({ kind: "invalid", errors: [] }), "Invalid Testcase");
  assert.equal(label({ kind: "empty" }), "No testcases");
  assert.equal(verdict(null), null);
});
test("nested node signatures are rejected and mismatched suites get synthetic names", () => {
  const nested = JSON.stringify({
    name: "mergeKLists",
    params: [{ name: "lists", type: "ListNode[]" }],
    return: { type: "ListNode" },
  });
  assert.equal(deriveSpec(nested), null);
  const suite = {
    method: "f",
    arguments: ["json", "json", "json"],
    output: "json",
    comparison: "exact",
  };
  const spec = testSpecFor(
    suite,
    JSON.stringify({
      name: "f",
      params: [{ name: "a", type: "integer" }],
      return: { type: "integer" },
    }),
  );
  assert.deepEqual(
    spec.params.map((p) => p.name),
    ["arg1", "arg2", "arg3"],
  );
  const derivedOnly = testSpecFor(
    null,
    JSON.stringify({
      name: "g",
      params: [{ name: "n", type: "integer" }],
      return: { type: "boolean" },
    }),
  );
  assert.equal(derivedOnly.derived, true);
  const { suite: built } = buildCustomSuite(derivedOnly, [
    { id: "a", input: ["4"], expected: "true" },
  ]);
  assert.equal(
    runJavascriptSuite("function g(n){ return n % 2 === 0; }", built).results[0]
      .passed,
    true,
  );
});
test("statement outputs are read through span/code wrappers and rejected when not JSON", () => {
  assert.deepEqual(
    exampleOutputs(
      "<strong>Output:</strong> <span>[1,1,1,3]</span><br/><strong>Output:</strong> <code>true</code><br/><strong>Output:</strong> see above",
    ),
    ["[1,1,1,3]", "true", ""],
  );
});
import { decode, matches, safeValue } from "../src/judge.mjs";
test("adapters and comparisons survive odd values", () => {
  assert.equal(decode(null, "tree"), null);
  assert.equal(decode(null, "list"), null);
  assert.equal(matches(NaN, null), false);
  assert.equal(matches(Infinity, null), false);
  assert.equal(matches(undefined, null), false);
  assert.equal(matches([1, NaN], [1, NaN]), true);
  const cyclic = { a: 1 };
  cyclic.self = cyclic;
  assert.deepEqual(safeValue(cyclic), { a: 1, self: "[cycle]" });
  assert.deepEqual(safeValue([10n, () => 1, Infinity]), [
    "10n",
    "[function]",
    "Infinity",
  ]);
  const inPlace = {
    method: "reorder",
    arguments: ["list"],
    output: "argument:0",
    comparison: "exact",
  };
  const { suite } = buildCustomSuite(
    { ...inPlace, params: [{ name: "head", type: "ListNode", kind: "list" }] },
    [{ id: "a", input: ["[1,2,3]"], expected: "[1,2,3]" }],
  );
  const result = runJavascriptSuite("function reorder(head){ return; }", suite);
  assert.equal(
    result.results[0].passed,
    true,
    "in-place list argument is encoded",
  );
  assert.deepEqual(exampleOutputs("<strong>Output:</strong> &quot;abc&quot;"), [
    '"abc"',
  ]);
});
