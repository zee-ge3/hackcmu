import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { rubric } from "../src/interviewer.mjs";
const base = process.env.BASE_URL || "http://localhost:3000";
const liveTest = process.env.LIVE_SMOKE === "1";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-audio-capture=${resolve("tests/fixtures/interview-request.wav")}`,
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["microphone"],
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.__voiceEvents = [];
  const Peer = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends Peer {
    constructor(...args) {
      super(...args);
      window.__voicePeer = this;
    }
    createDataChannel(...args) {
      const dc = super.createDataChannel(...args);
      dc.addEventListener("message", ({ data }) =>
        window.__voiceEvents.push(JSON.parse(data)),
      );
      return dc;
    }
  };
});
if (!liveTest) {
  await page.route("**/api/interviews/*/canvas", (route) =>
    route.fulfill({
      json: {
        revision: route.request().postDataJSON().revision,
        summary: "A drawn line.",
      },
    }),
  );
  await page.route("**/api/interviews/*/live", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Voice intentionally disabled in offline smoke test.",
      }),
    }),
  );
  await page.route("**/api/interviews/*/feedback", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        summary: "A clear approach with room to improve edge-case coverage.",
        criteria: Object.fromEntries(
          rubric.map((r) => [
            r.id,
            {
              score: r.id === "clarity" ? null : 3,
              evidence: "Observed code uses a map to track prior elements.",
              improvement: "Walk through a duplicate-input example.",
            },
          ]),
        ),
        strengths: ["Chose a linear-time approach."],
        next_steps: [
          "Add a duplicate-input test.",
          "Explain the invariant aloud.",
        ],
      }),
    }),
  );
}
try {
  await page.goto(base + "/coding");
  await page.waitForSelector(".problem-row");
  await page
    .getByRole("button", { name: "Realistic interview", exact: false })
    .click();
  await page.locator(".prompt-details summary").click();
  const prompt = page.getByLabel("Instructions for this interview");
  await prompt.fill(
    (await prompt.inputValue()) + " Begin with a warm welcome.",
  );
  await page.screenshot({ path: "/tmp/pairwise-setup.png", fullPage: true });
  await page.getByLabel("Search problem library").fill("1 Two Sum");
  await page.getByLabel("Fewer problems").click();
  const creation = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/interviews") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Enter interview room" }).click();
  const session = await (await creation).json();
  assert.equal(session.interviewerStyle, "realistic");
  assert.ok(session.interviewerPrompt.endsWith("Begin with a warm welcome."));
  await page.waitForSelector(".monaco-editor");
  assert.equal(
    await page.locator('.chat-input,input[aria-label="Message Alex"]').count(),
    0,
  );
  await page.locator(".monaco-editor textarea").first().focus();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+A" : "Control+A",
  );
  await page.keyboard.insertText(
    "function twoSum(nums,target){const seen=new Map();for(let i=0;i<nums.length;i++){if(seen.has(target-nums[i]))return [seen.get(target-nums[i]),i];seen.set(nums[i],i);}} console.log(twoSum([2,7,11,15],9));",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".console-heading>span")?.textContent !== "Ready",
  );
  assert.ok((await page.locator(".console pre").innerText()).includes("[0,1]"));
  await page.getByRole("button", { name: "Run tests", exact: false }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".console-heading>span")?.textContent ===
      "44/44 passed",
  );
  assert.ok(
    (await page.locator(".console pre").innerText()).includes(
      "44/44 tests passed",
    ),
  );
  await page.getByRole("button", { name: "Whiteboard", exact: true }).click();
  const box = await page.getByLabel("Shared drawing canvas").boundingBox();
  await page.mouse.move(box.x + 40, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 90, { steps: 5 });
  await page.mouse.up();
  await page.waitForSelector('[data-status="shared"]', { timeout: 120000 });
  const drawing = await page
    .getByLabel("Shared drawing canvas")
    .evaluate((c) => c.toDataURL());
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".monaco-editor")?.textContent.includes("twoSum"),
  );
  await page.getByRole("button", { name: "Whiteboard", exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Shared drawing canvas")
      .evaluate((c) => c.toDataURL()),
    drawing,
  );
  await page.getByRole("button", { name: "Code", exact: true }).click();
  const python = await page.evaluate(async () => {
    const { runCode } = await import("/src/runner.mjs");
    return runCode("print(sum([1,2,3]))", "python3");
  });
  assert.equal(python.ok, true, python.output);
  assert.equal(python.output.trim(), "6");
  console.log(
    "PASS: filters, editable preset, voice-only room, JavaScript and Python execution.",
  );
  if (liveTest) {
    await page.waitForFunction(
      () => window.__voiceEvents.some((e) => e.type === "session.started"),
      {},
      { timeout: 120000 },
    );
    await page.waitForSelector(".caption-turn.assistant", { timeout: 60000 });
    await page.waitForSelector(".caption-turn.user", { timeout: 60000 });
    await page.waitForSelector(".editor-activity", { timeout: 120000 });
    await page.waitForFunction(
      () =>
        document
          .querySelector(".transcript-label")
          ?.textContent.includes("Live captions"),
      {},
      { timeout: 120000 },
    );
    const check = await page.evaluate(async () => {
      const stats = await window.__voicePeer.getStats();
      return {
        energy: [...stats.values()]
          .filter((x) => x.type === "inbound-rtp")
          .reduce((n, x) => n + (x.totalAudioEnergy || 0), 0),
        delegated: window.__voiceEvents.some(
          (e) => e.type === "session.delegation.created",
        ),
        fragments: window.__voiceEvents.filter((e) =>
          e.type.includes("transcript.delta"),
        ).length,
        rows: document.querySelectorAll(".caption-turn").length,
      };
    });
    assert.ok(check.energy > 0.001);
    assert.ok(check.delegated);
    assert.ok(check.rows < check.fragments / 2);
    console.log(
      "PASS: automatic greeting, received audio, spoken request, delegation, editor update, readable grouped captions.",
    );
  }
  await page.screenshot({
    path: "/tmp/pairwise-workspace.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finish interview", exact: false })
    .click();
  await page.waitForSelector(".rubric-card", { timeout: 120000 });
  assert.equal(await page.locator(".rubric-card").count(), 5);
  assert.equal(await page.locator(".rubric-improvement").count(), 5);
  assert.ok((await page.locator(".feedback-summary").innerText()).length > 10);
  if (liveTest)
    assert.ok(
      await page.evaluate(() =>
        window.__voiceEvents.some(
          (e) => e.type === "session.closed" && e.reason === "close_requested",
        ),
      ),
    );
  if (liveTest)
    assert.equal(
      await page.locator(".room-error").count(),
      0,
      (await page.locator(".room-error").allTextContents()).join(" "),
    );
  await page.screenshot({ path: "/tmp/pairwise-feedback.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/pairwise-feedback-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  console.log(
    "PASS: five-criterion feedback, consistent rendering, mobile layout, and graceful close.",
  );
  assert.deepEqual(errors, []);
  console.log("PASS: no browser runtime errors.");
} finally {
  await browser.close();
}
