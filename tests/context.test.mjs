import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { resumeInput, registerCanvasRoutes } from "../server/context.mjs";
const data = (text) =>
  "data:text/plain;base64," + Buffer.from(text).toString("base64");
test("resume inputs reject invalid formats and preserve text", () => {
  assert.equal(
    resumeInput({ filename: "resume.txt", data: data("Example candidate") })
      .text,
    "Example candidate",
  );
  assert.throws(
    () => resumeInput({ filename: "resume.pdf", data: data("not PDF") }),
    /valid PDF/,
  );
  assert.throws(
    () => resumeInput({ filename: "resume.exe", data: data("bad") }),
    /PDF, DOCX/,
  );
  assert.throws(
    () =>
      resumeInput({
        filename: "resume.txt",
        data: data("a".repeat(5 * 1024 * 1024 + 1)),
      }),
    /5 MB/,
  );
});
test("late vision responses cannot overwrite a newer cleared whiteboard", async () => {
  let resolveVision;
  const pending = new Promise((resolve) => {
    resolveVision = resolve;
  });
  const session = { mode: "behavioral", targetRole: "Engineer" };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.interview = session;
    next();
  });
  registerCanvasRoutes(app, { openai: () => pending });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/interviews/demo/canvas`;
  const post = (body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  try {
    const first = post({
      revision: 1,
      image: "data:image/png;base64,aGVsbG8=",
    });
    while (!session.boards)
      await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await post({ revision: 2, empty: true });
    resolveVision({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "Old drawing" }],
        },
      ],
    });
    assert.equal((await first).stale, true);
    assert.match(second.summary, /empty/);
    assert.equal(session.boards[0].image, null);
    assert.equal(session.boards[0].revision, 2);
  } finally {
    server.close();
  }
});
