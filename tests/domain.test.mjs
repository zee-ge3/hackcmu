import test from "node:test";
import assert from "node:assert/strict";
import { filterProblems, applyEdit } from "../src/domain.mjs";
const problems = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "easy",
    companies: { Google: 2 },
    tags: ["Array"],
  },
  {
    id: 2,
    title: "Add Two Numbers",
    difficulty: "medium",
    companies: { Amazon: 1 },
    tags: ["Linked List"],
  },
];
test("company, subject and difficulty filters combine, with OR within each group", () => {
  assert.deepEqual(
    filterProblems(problems, {
      companies: ["Google", "Amazon"],
      topics: ["Array"],
      difficulty: "easy",
    }),
    [problems[0]],
  );
  assert.deepEqual(
    filterProblems(problems, {
      companies: ["Google"],
      topics: ["Linked List"],
    }),
    [],
  );
  assert.deepEqual(filterProblems(problems, { search: "two sum" }), [
    problems[0],
  ]);
});
test("stale agent edits cannot overwrite a newer candidate revision", () => {
  const editor = { code: "candidate draft", revision: 4 };
  assert.equal(
    applyEdit(editor, { expected_revision: 3, code: "agent edit" }).ok,
    false,
  );
  assert.equal(editor.code, "candidate draft");
  assert.equal(
    applyEdit(editor, { expected_revision: 4, code: "agent edit" }).ok,
    true,
  );
  assert.deepEqual(editor, { code: "agent edit", revision: 5 });
});

import {
  groupTranscript,
  rubric,
  feedbackSchema,
} from "../src/interviewer.mjs";
test("caption fragments form readable turns and preserve overlapping speech", () => {
  const raw = [
    { id: "a", role: "assistant", text: " Hello", start_ms: 100, end_ms: 300 },
    {
      id: "b",
      role: "assistant",
      text: ", there.",
      start_ms: 300,
      end_ms: 700,
    },
    { id: "c", role: "user", text: "Hi!", start_ms: 500, end_ms: 800 },
    {
      id: "d",
      role: "assistant",
      text: " Ready?",
      start_ms: 700,
      end_ms: 1100,
    },
    {
      id: "b",
      role: "assistant",
      text: ", there.",
      start_ms: 300,
      end_ms: 700,
    },
    {
      id: "e",
      role: "assistant",
      text: " Take your time.",
      start_ms: 4000,
      end_ms: 4800,
    },
  ];
  const rows = groupTranscript(raw);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].text, " Hello, there. Ready?");
  assert.equal(rows[1].role, "user");
  assert.equal(rows[2].text, " Take your time.");
  assert.equal(raw[0].text, " Hello");
});
test("reconnections do not merge separate voice session transcripts", () => {
  const rows = groupTranscript([
    {
      id: "a",
      role: "user",
      text: "First",
      start_ms: 0,
      end_ms: 100,
      segment: 1,
    },
    {
      id: "b",
      role: "user",
      text: "Second",
      start_ms: 0,
      end_ms: 100,
      segment: 2,
    },
  ]);
  assert.equal(rows.length, 2);
});
test("rubric permits insufficient evidence instead of fabricated scores", () => {
  assert.equal(rubric.length, 5);
  assert.deepEqual(
    feedbackSchema.properties.criteria.properties.clarity.properties.score.type,
    ["integer", "null"],
  );
  assert.deepEqual(
    feedbackSchema.properties.criteria.required,
    rubric.map((r) => r.id),
  );
});
