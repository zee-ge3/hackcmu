import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  loadVisuals,
  sketchUpTo,
  validateVisual,
  visualSummary,
} from "../server/visuals.mjs";
import { matchAnswer } from "../src/modes.mjs";
const root = new URL("../", import.meta.url);
test("every prepared visual is valid, belongs to a bank question, and grades", async () => {
  const { byId, problems } = await loadVisuals(
    new URL("data/probability/visuals/", root),
  );
  assert.deepEqual(problems, [], problems.join("\n"));
  assert.ok(byId.size >= 1);
  const bank = [
    ...JSON.parse(
      await readFile(new URL("data/probability/probability_bank.json", root)),
    ),
    ...JSON.parse(
      await readFile(
        new URL("data/probability/quantprof_extracted.json", root),
      ),
    ),
  ];
  const ids = new Set(bank.map((q) => q.id));
  for (const [id, v] of byId) {
    assert.ok(ids.has(id), `${id} is not in the bank`);
    assert.ok(v.answer, `${id} has no answer`);
    assert.notEqual(
      matchAnswer(v.answer, v.answer),
      null,
      `${id}: answer ${v.answer} does not parse`,
    );
    assert.ok(v.steps.length >= 1, `${id} has no steps`);
  }
});
test("worked steps are cumulative and the public summary hides them", () => {
  const visual = {
    id: "x",
    answer: "1/2",
    diagram: {
      caption: "setup",
      shapes: [{ kind: "box", x: 0, y: 0, w: 10, h: 10, text: "" }],
    },
    steps: [
      {
        caption: "a",
        text: "A",
        shapes: [{ kind: "label", x: 1, y: 1, w: 0, h: 0, text: "one" }],
      },
      {
        caption: "b",
        text: "B",
        shapes: [{ kind: "label", x: 2, y: 2, w: 0, h: 0, text: "two" }],
      },
    ],
  };
  assert.deepEqual(validateVisual(visual), []);
  assert.equal(sketchUpTo(visual, 0).length, 1);
  assert.equal(sketchUpTo(visual, 2).length, 3);
  assert.deepEqual(visualSummary(visual), {
    hasDiagram: true,
    diagramCaption: "setup",
    stepCount: 2,
  });
  assert.deepEqual(visualSummary(null), {
    hasDiagram: false,
    diagramCaption: null,
    stepCount: 0,
  });
  assert.ok(
    validateVisual({
      id: "y",
      diagram: {
        caption: "c",
        shapes: [{ kind: "box", x: 95, y: 0, w: 10, h: 10, text: "" }],
      },
    }).some((e) => /off the board/.test(e)),
  );
});
