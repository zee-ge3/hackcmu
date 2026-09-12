import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../server/store.mjs";
const fresh = () => openStore(mkdtempSync(join(tmpdir(), "pairwise-")));
test("sessions resolve to users and expire on logout", () => {
  const store = fresh();
  const user = store.upsertUser({
    sub: "g1",
    email: "A@example.com",
    name: "A",
  });
  const token = store.createSession(user.id);
  assert.equal(store.userForSession(token).id, user.id);
  assert.equal(store.userForSession("nope"), null);
  store.deleteSession(token);
  assert.equal(store.userForSession(token), null);
  assert.equal(
    store.upsertUser({ sub: "g1", email: "a@example.com", name: "A2" }).id,
    user.id,
  );
});
test("OpenAI keys are encrypted at rest and only a hint is public", () => {
  const store = fresh();
  const user = store.upsertUser({ sub: "g2", email: "b@example.com" });
  const apiKey = "sk-proj-" + "x".repeat(40) + "tail";
  store.setOpenaiKey(user.id, apiKey);
  assert.equal(store.openaiKey(user.id), apiKey);
  const row = store.getUser(user.id);
  assert.notEqual(row.openai_key, apiKey);
  assert.equal(store.publicUser(row).openaiKeyHint, "sk-…tail");
  store.setOpenaiKey(user.id, null);
  assert.equal(store.openaiKey(user.id), null);
});
test("resumes and interview history are scoped to their owner", () => {
  const store = fresh();
  const a = store.upsertUser({ sub: "a", email: "a@example.com" });
  const b = store.upsertUser({ sub: "b", email: "b@example.com" });
  const resume = store.createResume(a.id, {
    filename: "cv.pdf",
    profile: { name: "A", summary: "s", skills: ["x"], fullText: "text" },
  });
  assert.equal(resume.reviewedText, "text");
  assert.equal(store.getResume(b.id, resume.id), null);
  assert.equal(
    store.updateResume(b.id, resume.id, { reviewedText: "hack" }),
    null,
  );
  assert.equal(
    store.updateResume(a.id, resume.id, { reviewedText: "edited" })
      .reviewedText,
    "edited",
  );
  assert.equal(store.listResumes(a.id).length, 1);
  assert.equal(store.listResumes(b.id).length, 0);
  const feedback = {
    summary: "ok",
    criteria: {},
    strengths: [],
    next_steps: [],
  };
  store.recordInterview(a.id, {
    id: "i1",
    mode: "coding",
    title: "Two Sum",
    language: "javascript",
    createdAt: 1,
    feedback,
  });
  assert.deepEqual(store.listInterviews(a.id)[0].feedback, feedback);
  assert.equal(store.listInterviews(b.id).length, 0);
  assert.equal(store.deleteResume(b.id, resume.id), false);
  store.deleteUser(a.id);
  assert.equal(store.listResumes(a.id).length, 0);
  assert.equal(store.listInterviews(a.id).length, 0);
});
