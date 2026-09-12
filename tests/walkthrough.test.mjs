import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import {
  captions,
  curatedReference,
  describeSteps,
  findCase,
  traceReference,
  verifyReference,
  verificationSuite,
  walkthroughSuite,
  runWalkthrough,
} from "../server/walkthrough.mjs";
import { fillCaption } from "../src/captions.mjs";
const solutions = new URL("../data/solutions/", import.meta.url);
const suites = new URL("../data/test-suites/", import.meta.url);
const suiteFor = async (slug) =>
  JSON.parse(await readFile(new URL(`${slug}.json`, suites), "utf8"));

test("every curated reference solution passes its prepared suite", async () => {
  const files = (await readdir(solutions)).filter((f) => f.endsWith(".js"));
  assert.ok(files.length >= 15);
  for (const file of files) {
    const slug = file.replace(/\.js$/, "");
    const code = await curatedReference(slug, solutions);
    const suite = await suiteFor(slug);
    const check = await verifyReference(code, suite);
    assert.ok(check.ok, `${slug}: ${check.output || check.error}`);
    const { approach, notes } = captions(code);
    assert.ok(approach, `${slug} names its approach`);
    assert.ok(notes.size >= 5, `${slug} captions its steps`);
  }
});
test("a walkthrough of Two Sum shows the map filling and the pair being found", async () => {
  const suite = await suiteFor("two-sum");
  const code = await curatedReference("two-sum", solutions);
  const { notes, approach } = captions(code);
  assert.equal(approach, "One pass with a hash map of values already seen");
  const { steps, result } = await traceReference(code, suite, 0);
  assert.equal(result.ok, true);
  assert.ok(steps.length >= 6 && steps.length <= 12, String(steps.length));
  const shaped = steps.map(({ line, ...s }) => ({
    ...s,
    note: notes.get(line),
  }));
  assert.ok(
    shaped.every((s) => s.note),
    "every step has a caption",
  );
  assert.equal(
    fillCaption(shaped[3].note, shaped[3].vars),
    "Is 7 already in the map?",
  );
  const last = shaped.at(-1);
  assert.equal(last.ret.t, "arr");
  assert.equal(last.vars.seen.t, "map");
  assert.equal(last.vars.seen.v.length, 1);
  const lines = describeSteps(shaped);
  assert.match(lines[0], /^#1 Start with an empty map/);
  assert.match(lines.at(-1), /returns \[0, 1\]/);
  assert.ok(!lines.some((l) => /\bline\b/i.test(l)));
});
test("a looping reference is killed by the worker timeout and reports it", async () => {
  const suite = await suiteFor("two-sum");
  const t0 = Date.now();
  const check = await verifyReference(
    "var twoSum = function(){ while (true) {} }",
    suite,
  );
  assert.equal(check.ok, false);
  assert.match(check.error, /Timed out/);
  assert.ok(Date.now() - t0 < 20000);
});
test("case lookup accepts names, numbers, and the candidate's own cases", () => {
  const cases = [
    { name: "Example / boundary 1" },
    { name: "Example / boundary 2" },
    { name: "Generated case 1" },
    { name: "Your Case 2", own: true },
  ];
  assert.equal(findCase(cases, ""), 0);
  assert.equal(findCase(cases, "example / boundary 2"), 1);
  assert.equal(findCase(cases, "boundary 2"), 1);
  assert.equal(findCase(cases, "example 2"), 1);
  assert.equal(findCase(cases, "your case 2"), 3);
  assert.equal(findCase(cases, "my case 2"), 3);
  assert.equal(findCase(cases, "generated 1"), 2);
  assert.equal(findCase(cases, "case 9"), -1);
});
test("walkthrough cases mirror the Debugger list and derived problems verify on examples", async () => {
  const suite = await suiteFor("two-sum");
  const problem = {
    slug: "two-sum",
    testSuite: suite,
    testSpec: {
      method: "twoSum",
      params: [
        { name: "nums", type: "integer[]", kind: "json" },
        { name: "target", type: "integer", kind: "json" },
      ],
      arguments: ["json", "json"],
      output: "json",
      comparison: "unordered",
    },
    content:
      "<pre><strong>Input:</strong> nums = [2,7,11,15], target = 9\n<strong>Output:</strong> [0,1]</pre>",
    exampleTestcaseList: ["[2,7,11,15]\n9"],
  };
  const own = [
    { id: "a", input: ["[3,3]", "6"], expected: "[0,1]" },
    { id: "b", input: ["[1]", "2"], expected: "" },
  ];
  const merged = walkthroughSuite(problem, own);
  assert.equal(merged.cases.length, suite.cases.length + 1);
  assert.equal(merged.cases.at(-1).name, "Your Case 1");
  const derived = verificationSuite({ ...problem, testSuite: null });
  assert.equal(derived.cases.length, 1);
  assert.deepEqual(derived.cases[0].expected, [0, 1]);
  const out = await runWalkthrough({
    problem,
    customTests: own,
    caseName: "your case 1",
    solutionsDir: solutions,
  });
  assert.equal(out.client.case.name, "Your Case 1");
  assert.equal(out.client.result.ok, true);
  assert.ok(
    out.client.steps.every((s) => !("line" in s)),
    "no source lines leak",
  );
  assert.equal(out.forAgent.source, "curated");
  assert.match(out.forAgent.steps.at(-1), /returns \[0, 1\]/);
});
test("whiteboard shapes become strokes in Alex's ink on the 1200×800 canvas", async () => {
  const { shapeStrokes, ALEX_INK } = await import("../src/shapes.mjs");
  const [box] = shapeStrokes({
    kind: "box",
    x: 10,
    y: 20,
    w: 50,
    h: 25,
    text: "",
  });
  assert.equal(box.tool, "pen");
  assert.equal(box.color, ALEX_INK);
  assert.equal(box.by, "alex");
  assert.deepEqual(box.points[0], { x: 120, y: 160 });
  assert.deepEqual(box.points[2], { x: 720, y: 360 });
  assert.deepEqual(box.points[4], box.points[0], "box is closed");
  const [arrow] = shapeStrokes({
    kind: "arrow",
    x: 0,
    y: 0,
    w: 50,
    h: 100,
    text: "",
  });
  assert.equal(arrow.tool, "arrow");
  assert.deepEqual(arrow.points, [
    { x: 0, y: 0 },
    { x: 600, y: 800 },
  ]);
  const [label] = shapeStrokes({
    kind: "label",
    x: 5,
    y: 5,
    w: 0,
    h: 0,
    text: "head",
  });
  assert.equal(label.tool, "text");
  assert.equal(label.text, "head");
  const boxed = shapeStrokes({
    kind: "box",
    x: 10,
    y: 10,
    w: 10,
    h: 10,
    text: "7",
  });
  assert.equal(boxed.length, 2, "text inside the box is a second stroke");
  assert.equal(boxed[1].tool, "text");
  assert.deepEqual(boxed[1].points, [{ x: 180 - 6.5, y: 160 + 8 }]);
  const [circle] = shapeStrokes({
    kind: "circle",
    x: 40,
    y: 40,
    w: 20,
    h: 20,
    text: "",
  });
  assert.equal(circle.points.length, 41);
  assert.ok(
    circle.points.every(
      (p) => Math.abs(Math.hypot(p.x - 600, (p.y - 400) * 1.5) - 120) < 1e-6,
    ),
  );
});
