import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { problems } from "../scripts/test-problems.mjs";
import { pythonSolutions } from "./fixtures/python-solutions.mjs";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000");
  let total = 0;
  for (const p of problems) {
    const suite = JSON.parse(
      await readFile(
        new URL(`../data/test-suites/${p.slug}.json`, import.meta.url),
      ),
    );
    for (const language of ["javascript", "python3"]) {
      const code =
        language === "javascript"
          ? p.reference.toString()
          : pythonSolutions[p.slug];
      const result = await page.evaluate(
        async ({ code, language, suite }) => {
          const { runCode } = await import("/src/runner.mjs");
          return runCode(code, language, suite);
        },
        { code, language, suite },
      );
      assert.equal(result.ok, true, `${p.slug} ${language}: ${result.output}`);
      total += result.total;
    }
    console.log(
      `PASS ${p.slug}: ${suite.cases.length} cases in JavaScript and Python`,
    );
  }
  const suite = JSON.parse(
    await readFile(
      new URL("../data/test-suites/two-sum.json", import.meta.url),
    ),
  );
  const bad = await page.evaluate(async (suite) => {
    const { runCode } = await import("/src/runner.mjs");
    return runCode(
      "class Solution:\n    def twoSum(self,nums,target): return [0,0]",
      "python3",
      suite,
    );
  }, suite);
  assert.equal(bad.ok, false);
  assert.ok(bad.output.includes("Expected:"));
  console.log(
    `PASS: ${total} browser test executions, plus Python wrong-answer diagnostics.`,
  );
} finally {
  await browser.close();
}
