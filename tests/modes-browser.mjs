import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { behavioralRubric } from "../src/behavioral.mjs";
const real = process.env.LIVE_MODES === "1";
const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
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
const resumeText =
  "Sam Example\nSoftware engineer, Acme Demo, 2023–2025. Led a migration of a billing API with four teammates. Reduced request latency by 35 percent. Resolved disagreement about rollout by proposing a canary release. Built QueueGarden, a volunteer scheduling app. Skills: Python, JavaScript, SQL. Education: Example University, BS Computer Science, 2023.";
let session,
  canvasCalls = [];
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
      window.__voiceChannel = dc;
      dc.addEventListener("message", ({ data }) =>
        window.__voiceEvents.push(JSON.parse(data)),
      );
      return dc;
    }
  };
});
if (!real) {
  await page.route("**/api/resumes", (route) =>
    route.fulfill({
      json: {
        id: "synthetic",
        filename: "synthetic-resume.txt",
        profile: {
          name: "Sam Example",
          summary: "Software engineer with API migration experience.",
          skills: ["Python", "SQL"],
          fullText: resumeText,
        },
      },
    }),
  );
  await page.route("**/api/interviews", (route) => {
    const body = route.request().postDataJSON();
    session = {
      ...body,
      id: "behavioral-test",
      resume: {
        filename: "synthetic-resume.txt",
        name: "Sam Example",
        text: body.resumeText,
      },
      editors: [],
      problems: [],
      createdAt: Date.now(),
    };
    return route.fulfill({ json: session });
  });
  await page.route("**/api/interviews/*/live", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Voice disabled in offline test" },
    }),
  );
  await page.route("**/api/interviews/*/feedback", (route) =>
    route.fulfill({
      json: {
        summary: "Practice making your contribution and outcomes explicit.",
        criteria: Object.fromEntries(
          behavioralRubric.map((r) => [
            r.id,
            {
              score: null,
              evidence: "Not observed in this brief session.",
              improvement: "Use one specific example.",
            },
          ]),
        ),
        strengths: [],
        next_steps: ["Practice one story."],
      },
    }),
  );
  await page.route("**/api/interviews/*/canvas", async (route) => {
    const body = route.request().postDataJSON();
    canvasCalls.push(body);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return route.fulfill({
      json: {
        revision: body.revision,
        summary: body.empty
          ? "The whiteboard is empty."
          : "Client points to API, then Database.",
      },
    });
  });
} else
  page.on("request", (req) => {
    if (req.url().endsWith("/canvas")) canvasCalls.push(req.postDataJSON());
  });
try {
  await page.goto("http://localhost:3000");
  assert.equal(await page.locator(".mode-card").count(), 2);
  assert.equal(await page.locator(".config").count(), 0);
  await page.screenshot({ path: "/tmp/pairwise-home.png", fullPage: true });
  await page.locator(".coding-mode").click();
  await page.waitForSelector(".config");
  await page.goBack();
  await page.waitForSelector(".mode-card");
  await page.locator(".behavioral-mode").click();
  await page.getByLabel("Upload résumé").setInputFiles({
    name: "synthetic-resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(resumeText),
  });
  await page.waitForSelector("#resume-text", { timeout: 120000 });
  assert.match(
    await page.locator("#resume-text").inputValue(),
    /billing|migration/i,
  );
  await page
    .locator("#resume-text")
    .fill(
      resumeText +
        "\nReviewed correction: I personally designed the canary rollout.",
    );
  await page.getByLabel("Target role").fill("Backend engineer");
  await page.screenshot({
    path: "/tmp/pairwise-behavioral-setup.png",
    fullPage: true,
  });
  const creation = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/interviews") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Enter behavioral room" }).click();
  session = await (await creation).json();
  assert.equal(session.mode, "behavioral");
  assert.match(session.resume.text, /Reviewed correction/);
  await page.waitForSelector("canvas");
  assert.equal(await page.locator(".monaco-editor").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "Run", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Add label", exact: true }).click();
  await page.getByLabel("Whiteboard label").fill("Client -> API -> Database");
  await page.locator("canvas").click({ position: { x: 65, y: 120 } });
  await page.waitForSelector('[data-status="shared"]', { timeout: 120000 });
  assert.equal(canvasCalls.length, 1);
  assert.match(canvasCalls[0].image, /^data:image\/png;base64,/);
  await page.locator(".board-summary summary").click();
  assert.match(await page.locator(".board-summary p").innerText(), /Client/i);
  await page.screenshot({
    path: "/tmp/pairwise-behavioral-room.png",
    fullPage: true,
  });
  if (real) {
    await page.waitForSelector(".caption-turn.assistant", { timeout: 120000 });
    assert.match(
      await page.locator(".caption-turn.assistant").first().innerText(),
      /Sam|experience|Acme|migration|billing|background|project/i,
    );
    const agent = await context.request.post(
      `http://localhost:3000/api/interviews/${session.id}/agent`,
      {
        headers: { Origin: "http://localhost:3000" },
        data: {
          index: 0,
          request:
            "Briefly tell me what you see on my whiteboard, and ask one follow-up about my billing migration.",
          transcript: [],
        },
      },
    );
    assert.ok(agent.ok(), await agent.text());
    const result = await agent.json();
    assert.match(result.message, /API|Database|Client/i);
    assert.match(result.message, /billing|migration|rollout/i);
    const energy = await page.evaluate(async () =>
      [...(await window.__voicePeer.getStats()).values()]
        .filter((s) => s.type === "inbound-rtp")
        .reduce((sum, s) => sum + (s.totalAudioEnergy || 0), 0),
    );
    assert.ok(energy > 0);
    assert.equal(await page.locator(".room-error").count(), 0);
    console.log(
      "PASS: real resume parsing, resume-grounded voice greeting, vision summary, and multimodal reasoning.",
    );
  }
  await page.getByRole("button", { name: "Clear whiteboard" }).click();
  await page.waitForSelector('[data-status="shared"]', { timeout: 120000 });
  assert.equal(canvasCalls.at(-1).empty, true);
  assert.match(await page.locator(".board-summary p").innerText(), /empty/i);
  if (!real) {
    await page.getByLabel("Whiteboard label").fill("Final sketch");
    await page.locator("canvas").click({ position: { x: 50, y: 70 } });
    assert.equal(
      await page.locator(".board-status").getAttribute("data-status"),
      "pending",
    );
  }
  await page
    .getByRole("button", { name: "Finish interview", exact: false })
    .click();
  await page.waitForSelector(".rubric-card", { timeout: 120000 });
  if (!real)
    assert.equal(
      canvasCalls.at(-1).empty,
      false,
      "Finish flushes pending drawing",
    );
  assert.equal(await page.locator(".rubric-card").count(), 5);
  for (const r of behavioralRubric)
    assert.ok((await page.locator(".feedback").innerText()).includes(r.label));
  await page.screenshot({
    path: "/tmp/pairwise-behavioral-feedback.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mode navigation, reviewed resume context, behavioral-only room, debounced canvas/clear, behavioral rubric, no browser errors.",
  );
} finally {
  await browser.close();
}
