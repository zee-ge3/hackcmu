import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
// Probability and design rooms, session URLs, and the problem picker, with
// voice and vision mocked. Requires a dev server started with DEV_USER_EMAIL.
const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/interviews/*/live", (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Voice disabled in rooms test" }),
  }),
);
await page.route("**/api/interviews/*/canvas", (route) =>
  route.fulfill({
    json: {
      revision: route.request().postDataJSON().revision,
      summary: "A sketch.",
    },
  }),
);
const dismiss = () =>
  page
    .getByRole("button", { name: "Dismiss error" })
    .click()
    .catch(() => {});
try {
  // Probability: wrong answer, reveal, notes, next question.
  await page.goto(base + "/probability");
  await page.waitForSelector(".problem-row");
  await page.getByRole("button", { name: "Intro", exact: true }).click();
  await page.getByRole("button", { name: /^MATH/ }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForSelector(".probability-pane .math-text");
  assert.match(page.url(), /\/session\/[0-9a-f-]+$/);
  assert.match(
    await page
      .locator(".problem-jump")
      .evaluate((s) => s.selectedOptions[0].textContent),
    /Question 1 of 2/,
  );
  await page.locator(".notes-pane textarea").fill("## Setup\n- 36 outcomes");
  await page.getByLabel("Answer", { exact: true }).fill("999/1000");
  await page.getByRole("button", { name: "Check" }).click();
  await page.waitForSelector(".attempts li.wrong");
  // Hint: the backend's reply is shown under the question and, with voice
  // off, lands in the transcript as an Alex turn.
  await page.route("**/api/interviews/*/agent", (route) =>
    route.fulfill({
      json: {
        message: "Think about how many equally likely outcomes there are.",
        edits: [],
        runCode: false,
        index: 0,
      },
    }),
  );
  await page.getByRole("button", { name: /^Hint/ }).click();
  await page.waitForSelector(".hints li");
  assert.match(
    await page.locator(".hints li").innerText(),
    /equally likely outcomes/,
  );
  assert.match(
    await page.getByRole("button", { name: /^Hint/ }).innerText(),
    /Hint · 1/,
  );
  assert.match(
    await page.locator(".caption-turn.assistant").last().innerText(),
    /equally likely outcomes/,
    "text reply in the transcript",
  );
  await page.unroute("**/api/interviews/*/agent");
  // Alex can write into the scratch pad when asked; the text is typed in.
  const sessionId = page.url().split("/session/")[1];
  await page.route("**/api/interviews/*/agent", async (route) => {
    const current = await (
      await page.request.get(`${base}/api/interviews/${sessionId}`)
    ).json();
    const editor = current.editors[current.index];
    const code =
      editor.code + "\n\n## Sample space\n- 6 × 6 = 36 ordered pairs\n";
    await route.fulfill({
      json: {
        message: "I wrote the sample space down for you.",
        editor: { code, revision: editor.revision },
        edits: [{ reason: "sample space", code, revision: editor.revision }],
        runCode: false,
        index: current.index,
      },
    });
  });
  await page.evaluate(() => {
    window.__askDone = window.__pairwise.ask("Write the sample space down.");
  });
  const notes = page.locator(".notes-pane textarea");
  const partials = new Set();
  const typingStart = Date.now();
  while (Date.now() - typingStart < 15000) {
    const value = await notes.inputValue();
    partials.add(value);
    if (/36 ordered pairs\n$/.test(value)) break;
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.__askDone);
  assert.match(
    await notes.inputValue(),
    /## Setup\n- 36 outcomes[\s\S]*36 ordered pairs/,
  );
  assert.ok(partials.size >= 3, `notes typed progressively (${partials.size})`);
  assert.equal(
    await notes.getAttribute("readonly"),
    null,
    "pad editable again",
  );
  await page.unroute("**/api/interviews/*/agent");
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.waitForSelector(".solution");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForFunction(() =>
    /Question 2 of 2/.test(
      document.querySelector(".problem-jump")?.selectedOptions[0]
        ?.textContent || "",
    ),
  );
  assert.equal(
    await page.locator(".attempts li").count(),
    0,
    "attempts reset per question",
  );
  await page.reload();
  await page.waitForSelector(".probability-pane .math-text");
  assert.match(
    await page
      .locator(".problem-jump")
      .evaluate((s) => s.selectedOptions[0].textContent),
    /Question 2 of 2/,
    "rejoin keeps the question",
  );
  await dismiss();
  // Design: countdown, manual reveal, notes template, whiteboard tab.
  await page.goto(base + "/design");
  await page.waitForSelector(".design-option");
  await page.locator(".design-option", { hasText: "Ticket booking" }).click();
  await page.getByRole("button", { name: "20 min" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForSelector(".design-pane");
  assert.match(
    await page.locator(".clock").innerText(),
    /^(19|20):\d\d$/,
    "topbar shows remaining time",
  );
  assert.match(
    await page.locator(".notes-pane textarea").inputValue(),
    /Requirements/,
  );
  await page.getByRole("button", { name: "Reveal now" }).click();
  await page.waitForSelector(".stage.latest");
  assert.match(await page.locator(".stage-count").innerText(), /1 \/ 3/);
  await page.getByRole("button", { name: "Whiteboard", exact: true }).click();
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "Add label", exact: true }).click();
  await page.getByLabel("Whiteboard label").fill("API -> queue");
  await page.locator("canvas").click({ position: { x: 60, y: 90 } });
  await page.waitForSelector('[data-status="shared"]');
  // Alex sketches on the whiteboard: shapes become strokes in its own ink.
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const before = await page.evaluate(() => window.__pairwise.strokes());
  await page.route("**/api/interviews/*/agent", (route) =>
    route.fulfill({
      json: {
        message: "Here is the API in front of a queue.",
        edits: [],
        runCode: false,
        boardShapes: [
          { kind: "box", x: 10, y: 40, w: 20, h: 12, text: "" },
          { kind: "label", x: 12, y: 48, w: 0, h: 0, text: "API" },
          { kind: "arrow", x: 32, y: 46, w: 14, h: 0, text: "" },
          { kind: "circle", x: 48, y: 38, w: 18, h: 16, text: "" },
        ],
        index: 0,
      },
    }),
  );
  await page.evaluate(() => window.__pairwise.ask("Can you sketch it?"));
  await page.unroute("**/api/interviews/*/agent");
  assert.equal(
    await page.evaluate(() => window.__pairwise.strokes()),
    before + 4,
    "four strokes added",
  );
  assert.match(
    await page.locator(".surface-tabs > button.active").innerText(),
    /Whiteboard/,
    "whiteboard opened for the sketch",
  );
  await page.waitForSelector('[data-status="shared"]');
  await dismiss();
  // Profile renders for the dev user.
  await page.goto(base + "/profile");
  await page.waitForSelector(".profile-card");
  assert.match(await page.locator(".history-card h2").innerText(), /History/);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: probability answer/reveal/next + rejoin, design countdown/reveal/whiteboard, profile.",
  );
} finally {
  await browser.close();
}
