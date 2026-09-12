import test from "node:test";
import assert from "node:assert/strict";
import {
  matchAnswer,
  designProblems,
  probabilityLevels,
} from "../src/modes.mjs";
import { buildInsights } from "../server/insights.mjs";
import { filterProblems } from "../src/domain.mjs";
import { rubric } from "../src/interviewer.mjs";
test("answers match across fractions, decimals, LaTeX, and percentages", () => {
  assert.equal(matchAnswer("17/24", "\\frac{17}{24}"), true);
  assert.equal(matchAnswer("0.7083", "\\frac{17}{24}"), true);
  assert.equal(matchAnswer("0.667", "2/3"), true);
  assert.equal(matchAnswer("0.66", "2/3"), false);
  assert.equal(matchAnswer("1/3", "\\frac{17}{24}"), false);
  assert.equal(matchAnswer("50%", "\\dfrac{1}{2}"), true);
  assert.equal(matchAnswer("2^10", "1024"), true);
  assert.equal(matchAnswer("\\boxed{5}", "5"), true);
  assert.equal(
    matchAnswer("n(n+1)/2", "3"),
    null,
    "algebra defers to the model",
  );
  assert.equal(matchAnswer("alert(1)", "3"), null, "no code reaches eval");
});
test("design bank stages reveal in increasing time order", () => {
  for (const p of designProblems) {
    assert.ok(p.brief.length > 40, p.id);
    const ats = p.stages.map((s) => s.at);
    assert.deepEqual(
      ats,
      [...ats].sort((a, b) => a - b),
    );
    assert.ok(ats.every((a) => a > 0 && a < 1));
  }
  assert.equal(probabilityLevels.intro.test(3), true);
  assert.equal(probabilityLevels.hard.test(3), false);
});
test("insights surface the weakest criteria and topics across sessions", () => {
  const fb = (scores) => ({
    summary: "",
    strengths: [],
    next_steps: [],
    criteria: Object.fromEntries(
      rubric.map((r, i) => [
        r.id,
        { score: scores[i], evidence: "", improvement: "" },
      ]),
    ),
  });
  const insights = buildInsights(
    [
      {
        id: "a",
        mode: "coding",
        title: "Two Sum",
        finishedAt: 1,
        topics: ["Array", "Hash Table"],
        feedback: fb([4, 2, 4, null, 3]),
      },
      {
        id: "b",
        mode: "coding",
        title: "3Sum",
        finishedAt: 2,
        topics: ["Array", "Two Pointers"],
        feedback: fb([5, 1, 4, 3, 5]),
      },
    ],
    { coding: rubric },
  );
  assert.equal(insights.sessions, 2);
  assert.equal(insights.weakestCriteria[0].id, "correctness");
  assert.equal(insights.weakestCriteria[0].n, 2);
  assert.equal(insights.weakest[0].topic, "Hash Table");
  assert.equal(insights.modes.coding.count, 2);
  assert.equal(insights.trend.length, 2);
});
test("catalog list filters narrow to Blind 75 / NeetCode 150 membership", () => {
  const problems = [
    {
      id: 1,
      title: "A",
      difficulty: "easy",
      companies: {},
      tags: [],
      lists: ["blind75", "neetcode150"],
    },
    {
      id: 2,
      title: "B",
      difficulty: "easy",
      companies: {},
      tags: [],
      lists: ["neetcode150"],
    },
    {
      id: 3,
      title: "C",
      difficulty: "easy",
      companies: {},
      tags: [],
      lists: [],
    },
  ];
  assert.deepEqual(
    filterProblems(problems, { lists: ["blind75"] }).map((p) => p.id),
    [1],
  );
  assert.deepEqual(
    filterProblems(problems, { lists: ["neetcode150"] }).map((p) => p.id),
    [1, 2],
  );
  assert.equal(filterProblems(problems, {}).length, 3);
});
test("answers without a numeric reference defer to the model", () => {
  assert.equal(matchAnswer("1/3", null), null);
  assert.equal(matchAnswer("", "1/3"), null);
});
