import test from "node:test";
import assert from "node:assert/strict";
import { addTestcases } from "../server/testcases.mjs";
const session = () => ({
  problems: [
    {
      testSpec: {
        params: [
          { name: "nums", kind: "json" },
          { name: "target", kind: "json" },
        ],
      },
    },
    { testSpec: null },
  ],
  customTests: [
    [{ id: "example-1", input: ["[2,7,11,15]", "9"], expected: "[0,1]" }],
    [],
  ],
});
test("Alex's testcases are validated, appended, and marked", () => {
  const s = session();
  const out = addTestcases(
    s,
    0,
    {
      cases: [
        { inputs: ["[3,3]", "6"], expected: "[0,1]" },
        { inputs: ["[1]", "2"], expected: "" },
        { inputs: ["[1,2]"], expected: "" },
        { inputs: ["not json", "1"], expected: "[]" },
        { inputs: ["[1,2]", "3"], expected: "oops" },
      ],
    },
    1000,
  );
  assert.equal(out.ok, true);
  assert.equal(out.added.length, 2);
  assert.deepEqual(out.added[0], {
    case: 2,
    id: "alex-rs-0",
    input: ["[3,3]", "6"],
    expected: "[0,1]",
    by: "alex",
  });
  assert.equal(out.total, 3);
  assert.equal(out.rejected.length, 3);
  assert.match(out.rejected[0], /expected 2 inputs \(nums, target\)/);
  assert.match(out.rejected[1], /nums must be JSON text/);
  assert.match(out.rejected[2], /expected must be JSON text/);
  assert.equal(s.customTests[0].length, 3);
  assert.equal(s.customTests[0][0].by, undefined, "candidate cases untouched");
});
test("Alex's testcases respect the panel cap and problems without a signature", () => {
  const s = session();
  assert.match(
    addTestcases(s, 1, { cases: [{ inputs: [], expected: "" }] }).error,
    /no callable signature/,
  );
  assert.match(addTestcases(s, 0, { cases: [] }).error, /at least one/);
  s.customTests[0] = Array.from({ length: 49 }, (_, i) => ({
    id: `c${i}`,
    input: ["[1]", "1"],
    expected: "",
  }));
  assert.match(
    addTestcases(s, 0, {
      cases: [
        { inputs: ["[1]", "1"], expected: "" },
        { inputs: ["[2]", "2"], expected: "" },
      ],
    }).error,
    /holds 50 cases/,
  );
  assert.equal(s.customTests[0].length, 49, "nothing added on refusal");
});
