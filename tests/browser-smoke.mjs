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
    .getByRole("button", { name: "Standard interviewer", exact: false })
    .click();
  await page.locator(".prompt-details summary").click();
  const prompt = page.getByLabel("System prompt");
  await prompt.fill(
    (await prompt.inputValue()) + " Begin with a warm welcome.",
  );
  await page.screenshot({ path: "/tmp/pairwise-setup.png", fullPage: true });
  await page.getByLabel("Search problem library").fill("1 Two Sum");
  await page.getByLabel("Fewer problems").click();
  await page.getByLabel("Debugger").check();
  const creation = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/interviews") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Start", exact: true }).click();
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
  // Testcase panel is seeded from the statement's examples; add one of our own.
  assert.equal(await page.getByRole("tab", { name: /^Case \d/ }).count(), 3);
  assert.equal(
    await page.getByLabel("Case 1 nums").inputValue(),
    "[2,7,11,15]",
  );
  assert.equal(await page.getByLabel("Case 1 expected").inputValue(), "[0,1]");
  await page.getByRole("button", { name: "Add testcase" }).click();
  const synced = page.waitForRequest(
    (r) => r.url().endsWith("/tests") && r.method() === "PUT",
  );
  await page.getByLabel("Case 4 nums").fill("[1,5,3]");
  await page.getByLabel("Case 4 target").fill("8");
  await page.getByLabel("Case 4 expected").fill("[1,2]");
  const syncBody = (await synced).postDataJSON();
  assert.equal(syncBody.tests.length, 4);
  // A fifth case without an expected value runs but is not graded.
  await page.getByRole("button", { name: "Add testcase" }).click();
  await page.getByLabel("Case 5 nums").fill("[0,4,3,0]");
  await page.getByLabel("Case 5 target").fill("0");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    /Accepted/.test(document.querySelector(".tc-status")?.textContent || ""),
  );
  assert.match(
    await page.locator(".tc-status").innerText(),
    /4\/4 testcases passed/,
  );
  await page.getByRole("tab", { name: "Case 5" }).click();
  assert.match(
    await page.locator(".tc-detail").innerText(),
    /output =\s*\[0,3\]/,
  );
  assert.ok((await page.locator(".tc-stdout").innerText()).includes("[0,1]"));
  // Invalid JSON is refused before anything runs, LeetCode-style.
  await page.getByRole("tab", { name: "Testcase", exact: true }).click();
  await page.getByRole("tab", { name: "Case 5" }).click();
  await page.getByLabel("Case 5 nums").fill("[0,4");
  assert.equal(await page.locator(".tc-problems li").count(), 1);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.waitForFunction(() =>
    /Invalid Testcase/.test(
      document.querySelector(".tc-status")?.textContent || "",
    ),
  );
  await page.getByRole("tab", { name: "Testcase", exact: true }).click();
  await page.getByRole("button", { name: "Remove case 5" }).click();
  assert.equal(await page.getByRole("tab", { name: /^Case \d/ }).count(), 4);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForFunction(() =>
    /44\/44/.test(document.querySelector(".tc-status")?.textContent || ""),
  );
  assert.match(await page.locator(".tc-status").innerText(), /Accepted/);
  // Opt-in visual debugger: trace the first case, watch pointers and the live line.
  await page.getByRole("tab", { name: "Debugger" }).click();
  await page.selectOption('select[aria-label="Debug test case"]', {
    label: "Your Case 4",
  });
  await page.getByRole("button", { name: "Trace", exact: true }).click();
  await page.waitForFunction(() =>
    /Passed · \d+ steps/.test(
      document.querySelector(".dbg-status")?.textContent || "",
    ),
  );
  assert.ok(
    (await page.locator(".dbg-cell.pointed").count()) > 0,
    "pointer markers",
  );
  await page.waitForSelector(".monaco-editor .debug-line");
  await page.getByRole("button", { name: "First step", exact: true }).click();
  assert.match(await page.locator(".dbg-steps span").innerText(), /^1 \//);
  // Alex's edits are typed in, not dumped: intermediate editor states exist,
  // the new lines carry the git-style marker, and the result is exact.
  let agentReply = null;
  await page.route("**/api/interviews/*/agent", async (route) => {
    const current = await (
      await page.request.get(`${base}/api/interviews/${session.id}`)
    ).json();
    const editor = current.editors[0];
    const reply = agentReply({ editor });
    await route.fulfill({ json: reply });
  });
  const before = await page.evaluate(() => window.__pairwise.code());
  const after = [
    "function twoSum(nums, target) {",
    "  const seen = new Map();",
    "  for (let i = 0; i < nums.length; i++) {",
    "    const need = target - nums[i];",
    "    if (seen.has(need)) return [seen.get(need), i];",
    "    seen.set(nums[i], i);",
    "  }",
    "  return [];",
    "}",
  ].join("\n");
  agentReply = ({ editor }) => ({
    message: "I reformatted it into a readable function.",
    editor: { code: after, revision: editor.revision },
    edits: [
      { reason: "readable layout", code: after, revision: editor.revision },
    ],
    runCode: false,
    index: 0,
  });
  await page.evaluate(() => {
    window.__askDone = window.__pairwise.ask("Tidy this up please.");
  });
  const seen = new Set();
  const typingStart = Date.now();
  while (Date.now() - typingStart < 15000) {
    const value = await page.evaluate(() => window.__pairwise.code());
    seen.add(value);
    if (value === after) break;
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.__askDone);
  assert.equal(await page.evaluate(() => window.__pairwise.code()), after);
  assert.ok(
    seen.size >= 4,
    `typed progressively (${seen.size} distinct states, before was ${JSON.stringify(before).slice(0, 40)})`,
  );
  assert.ok(
    (await page.locator(".monaco-editor .agent-added").count()) >= 3,
    "added lines are marked",
  );
  assert.match(
    await page.locator(".editor-activity").innerText(),
    /readable layout/,
  );
  // Alex's walkthrough: the reference approach on an example, data only.
  const { runWalkthrough } = await import("../server/walkthrough.mjs");
  const walk = await runWalkthrough({
    problem: session.problems[0],
    customTests: session.customTests[0],
    caseName: "Example / boundary 1",
    solutionsDir: new URL("../data/solutions/", import.meta.url),
  });
  agentReply = ({ editor }) => ({
    message:
      "Watch the map fill up: at step 4 we look for 7, and it is not there yet.",
    editor: { code: editor.code, revision: editor.revision },
    edits: [],
    runCode: false,
    walkthrough: walk.client,
    debuggerSteps: [1, 4],
    index: 0,
  });
  await page.evaluate(() => window.__pairwise.ask("I don't get this problem."));
  await page.waitForSelector(".debugger.walk");
  assert.match(
    await page.locator(".dbg-walk").innerText(),
    /One pass with a hash map of values already seen · Example \/ boundary 1/,
  );
  assert.match(
    await page.locator(".dbg-note").innerText(),
    /Start with an empty map/,
  );
  assert.equal(await page.locator(".monaco-editor .debug-line").count(), 0);
  await page.waitForFunction(
    () =>
      /^4 \//.test(
        document.querySelector(".dbg-steps span")?.textContent || "",
      ),
    null,
    { timeout: 12000 },
  );
  assert.equal(
    await page.locator(".dbg-note").innerText(),
    "Is 7 already in the map?",
  );
  const seenRow = page.locator(".dbg-row").filter({ hasText: "seen" });
  assert.match(await seenRow.innerText(), /empty/, "map still empty at step 4");
  await page.screenshot({ path: "/tmp/pairwise-walkthrough.png" });
  await page.getByRole("button", { name: "Last step", exact: true }).click();
  assert.equal(await seenRow.locator(".dbg-cell").count(), 1, "one map entry");
  assert.match(await seenRow.locator(".dbg-cell").innerText(), /2\s*0/);
  assert.match(await page.locator(".dbg-var.returns").innerText(), /\[0, 1\]/);
  await page.unroute("**/api/interviews/*/agent");
  const pythonTrace = await page.evaluate(async (suite) => {
    const { traceCode } = await import("/src/runner.mjs");
    const steps = [];
    const result = await traceCode(
      "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target - n], i]\n            seen[n] = i\n        return []",
      "python3",
      suite,
      0,
      (batch) => steps.push(...batch),
    ).done;
    return { result, steps: steps.length, first: steps[0] };
  }, session.problems[0].testSuite);
  assert.equal(pythonTrace.result.ok, true, pythonTrace.result.output);
  assert.ok(
    pythonTrace.steps > 3 && pythonTrace.first.vars.nums.t === "arr",
    "python trace",
  );
  await page.getByRole("tab", { name: "Testcase", exact: true }).click();
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
  const pythonCases = await page.evaluate(async (spec) => {
    const { runCode } = await import("/src/runner.mjs");
    const { buildCustomSuite } = await import("/src/domain.mjs");
    const { suite } = buildCustomSuite(spec, [
      { id: "a", input: ["[2,7,11,15]", "9"], expected: "[0,1]" },
      { id: "b", input: ["[3,3]", "6"], expected: "" },
    ]);
    return runCode(
      "class Solution:\n    def twoSum(self, nums, target):\n        print('py')\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target - n], i]\n            seen[n] = i\n        return []",
      "python3",
      suite,
    );
  }, session.problems[0].testSpec);
  assert.equal(pythonCases.results[0].passed, true);
  assert.equal(pythonCases.results[1].passed, null);
  assert.deepEqual(pythonCases.results[1].actual, [0, 1]);
  assert.match(pythonCases.stdout, /py/);
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
  await page.getByRole("button", { name: "Finish", exact: true }).click();
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
