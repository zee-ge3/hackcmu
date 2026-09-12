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
  await dismiss();
  // Profile renders for the dev user.
  await page.goto(base + "/profile");
  await page.waitForSelector(".profile-card");
  assert.equal(await page.locator(".history-card").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: probability answer/reveal/next + rejoin, design countdown/reveal/whiteboard, profile.",
  );
} finally {
  await browser.close();
}
