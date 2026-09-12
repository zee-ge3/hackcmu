import { validateInput } from "../scripts/validate-test-input.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { problems } from "../scripts/test-problems.mjs";
import { runJavascriptSuite, matches } from "../src/judge.mjs";
for (const p of problems)
  test(`prepared suite: ${p.slug} accepts reference and rejects empty solution`, async () => {
    const suite = JSON.parse(
      await readFile(
        new URL(`../data/test-suites/${p.slug}.json`, import.meta.url),
      ),
    );
    suite.cases.forEach((c) => validateInput(p.slug, c.input));
    const result = runJavascriptSuite(p.reference.toString(), suite);
    assert.equal(result.ok, true, result.output);
    assert.equal(result.total, suite.cases.length);
    assert.equal(
      runJavascriptSuite(`function ${p.method}(){}`, suite).ok,
      false,
    );
  });
test("comparators accept valid order variations but reject duplicates and invalid values", () => {
  assert.ok(matches([1, 0], [0, 1], "unordered"));
  assert.ok(
    matches(
      [
        [1, -1, 0],
        [2, -2, 0],
      ],
      [
        [0, -2, 2],
        [-1, 0, 1],
      ],
      "triplets",
    ),
  );
  assert.equal(
    matches(
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
      [[0, 0, 0]],
      "triplets",
    ),
    false,
  );
  assert.equal(matches("false", false), false);
});
test("cycle in returned data reports an error instead of hanging", () => {
  const result = runJavascriptSuite(
    "function reverseList(head){head.next=head;return head;}",
    {
      version: 1,
      method: "reverseList",
      arguments: ["list"],
      output: "list",
      cases: [{ name: "cycle", input: [[1, 2]], expected: [2, 1] }],
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.output, /cycle/);
});
