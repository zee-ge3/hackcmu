import test from "node:test";
import assert from "node:assert/strict";
import { asksQuiet, spokenResult, reengages } from "../src/voice.mjs";
test("quiet requests are recognised without tripping on unrelated phrases", () => {
  for (const s of [
    "shut up",
    "give me a minute",
    "let me think about it",
    "hold on",
    "hang on.",
    "can you be quiet for a sec",
    "let me just code this",
  ])
    assert.ok(asksQuiet(s), s);
  for (const s of [
    "what's the time complexity",
    "I'll hold on to the left pointer",
    "hang on to the previous node",
    "one second thought: hash map",
    "the quiet part is done",
    "not sure about second case",
    "can you give me a second example",
    "we need a minute-level bucket",
  ])
    assert.equal(asksQuiet(s), false, s);
  assert.equal(reengages("okay"), false);
  assert.equal(reengages("Alex?"), true);
  assert.equal(reengages("okay what do you think of this"), true);
});
test("spoken reactions match the verdict and name the failing case", () => {
  assert.match(
    spokenResult({
      kind: "submit",
      passed: 44,
      total: 44,
      results: [{ passed: true }],
    }),
    /All 44 hidden tests pass/,
  );
  assert.match(
    spokenResult({
      kind: "submit",
      passed: 40,
      total: 44,
      results: [{ passed: true }, { name: "Case 7", passed: false }],
    }),
    /40 of 44.*Case 7 fails/,
  );
  assert.match(
    spokenResult({
      kind: "run",
      results: [{ passed: true }, { passed: true }],
    }),
    /2 testcases pass/,
  );
  assert.match(
    spokenResult({ kind: "run", results: [{ name: "Case 2", passed: false }] }),
    /Case 2 gives the wrong answer/,
  );
  assert.match(
    spokenResult({
      kind: "run",
      results: [
        { name: "Case 1", passed: false, error: "TypeError: x is undefined" },
      ],
    }),
    /Case 1 throws TypeError/,
  );
  assert.match(
    spokenResult({
      kind: "run",
      ok: false,
      output: "Execution timed out (15 seconds).",
    }),
    /timed out/,
  );
});
