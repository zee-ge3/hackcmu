// Walkthroughs: the interviewer visualizes the reference approach on a
// testcase without touching the candidate's code. A hidden JavaScript
// reference solution (curated file, cached, or generated and verified) runs
// under the tracer in a worker thread; the candidate receives only the data
// snapshots plus a plain-English caption per step, never the source.
import { readFile } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import { parse } from "acorn";
import sanitizeHtml from "sanitize-html";
import { buildCustomSuite, seedCases } from "../src/domain.mjs";
import { briefValue, fillCaption } from "../src/captions.mjs";

const curated = new Map();
export async function curatedReference(slug, dir) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (!curated.has(slug)) {
    try {
      curated.set(slug, await readFile(new URL(`${slug}.js`, dir), "utf8"));
    } catch {
      curated.set(slug, null);
    }
  }
  return curated.get(slug);
}

// Captions come from comments: a trailing `// …` describes its own line, a
// full-line comment describes the next line of code. `// approach: …` on the
// first line names the technique.
export function captions(code) {
  const lines = code.split("\n");
  const notes = new Map();
  let approach = null;
  const comments = [];
  parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true,
    allowReturnOutsideFunction: true,
    onComment: (block, text, start, _end, startLoc) =>
      comments.push({ block, text: text.trim(), start, line: startLoc.line }),
  });
  for (const c of comments) {
    const m = /^approach:\s*(.+)$/i.exec(c.text);
    if (m) {
      approach = m[1].trim();
      continue;
    }
    if (!c.text) continue;
    const before = lines[c.line - 1].slice(
      0,
      c.start -
        lines.slice(0, c.line - 1).reduce((n, l) => n + l.length + 1, 0),
    );
    if (before.trim()) notes.set(c.line, c.text);
    else {
      let next = c.line + 1;
      while (next <= lines.length && !lines[next - 1].trim()) next++;
      if (next <= lines.length && !notes.has(next)) notes.set(next, c.text);
    }
  }
  return { approach, notes };
}

// Runs a worker with a hard timeout; a solution that never returns is killed.
function inWorker(data, { timeout = 8000, onSteps } = {}) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./trace-worker.mjs", import.meta.url), {
      workerData: data,
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          error: `Timed out after ${timeout / 1000} seconds.`,
          timedOut: true,
        }),
      timeout,
    );
    worker.on("message", (m) => {
      if (m.type === "steps") onSteps?.(m.steps);
      else finish(m.result);
    });
    worker.on("error", (e) => finish({ ok: false, error: e.message }));
    worker.on("exit", (code) => {
      if (code !== 0) finish({ ok: false, error: `Worker exited (${code}).` });
    });
  });
}
export const verifyReference = (code, suite) =>
  inWorker({ op: "verify", code, suite }, { timeout: 15000 });

export async function traceReference(
  code,
  suite,
  caseIndex,
  { limit = 400 } = {},
) {
  const steps = [];
  const result = await inWorker(
    { op: "trace", code, suite, caseIndex, limit },
    { onSteps: (batch) => steps.push(...batch) },
  );
  return { steps, result };
}

// The cases Alex may walk through: the prepared suite, then the candidate's
// own cases that carry an expected value (the same list the Debugger shows).
export function walkthroughSuite(problem, customTests) {
  const prepared = problem.testSuite;
  const own = problem.testSpec
    ? buildCustomSuite(problem.testSpec, customTests || [])
        .suite.cases.filter((c) => "expected" in c)
        .map((c) => ({ ...c, own: true, name: `Your ${c.name}` }))
    : [];
  if (!prepared && !own.length) return null;
  return {
    ...(prepared || problem.testSpec),
    cases: [...(prepared?.cases || []), ...own],
  };
}
// "Example 2", "case 2", "Your Case 2", "generated 1": an exact or contained
// name wins; otherwise the case whose name shares the most words (the number
// must match) is chosen, preferring the candidate's own cases only when the
// request says "your" or "my".
export function findCase(cases, name) {
  const wanted = String(name || "")
    .trim()
    .toLowerCase();
  if (!wanted) return 0;
  const names = cases.map((c) => (c.name || "").toLowerCase());
  let i = names.indexOf(wanted);
  if (i >= 0) return i;
  i = names.findIndex((n) => n.includes(wanted));
  if (i >= 0) return i;
  const tokens = wanted.split(/[^a-z0-9]+/).filter(Boolean);
  const number = tokens.find((t) => /^\d+$/.test(t));
  if (!number) return -1;
  const own = tokens.some((t) => ["your", "my", "custom", "own"].includes(t));
  const has = (n, t) => new RegExp(`\\b${t}\\b`).test(n);
  let best = -1,
    bestScore = 0;
  names.forEach((n, k) => {
    if (!has(n, number)) return;
    const score =
      tokens.filter((t) => has(n, t)).length +
      (!!cases[k].own === own ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  });
  return best;
}

// Suite used to verify a generated reference: the prepared suite, else the
// statement's examples with their printed outputs.
export function verificationSuite(problem) {
  if (problem.testSuite) return problem.testSuite;
  if (!problem.testSpec) return null;
  const seeds = seedCases(problem, problem.testSpec, null);
  const { suite } = buildCustomSuite(problem.testSpec, seeds);
  const cases = suite.cases.filter((c) => "expected" in c);
  return cases.length ? { ...suite, cases } : null;
}

const stripFences = (text) =>
  text
    .replace(/^\s*```(?:javascript|js)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

export async function generateReference(
  problem,
  suite,
  { openai, apiKey, model },
) {
  const statement = sanitizeHtml(problem.content || "", {
    allowedTags: [],
    allowedAttributes: {},
  }).slice(0, 6000);
  const starter =
    problem.codeSnippets?.find((c) => c.langSlug === "javascript")?.code || "";
  const signature = {
    method: suite.method,
    params: (problem.testSpec?.params || []).map((p) => `${p.name}: ${p.type}`),
    returns: problem.testSpec?.returnType || suite.output,
    argumentKinds: suite.arguments,
  };
  const examples = suite.cases
    .slice(0, 3)
    .map((c) => ({ input: c.input, expected: c.expected }));
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const d = await openai(
      "responses",
      {
        model,
        instructions:
          "You write a hidden reference solution used only to drive a step-by-step visualizer. The candidate never sees the code, only how the variables change, so the code must be simple and visual. Return JavaScript only, with no Markdown fences and no prose. Rules: the first line is `// approach: <five to eight words naming the technique>`. Define exactly the entry point `var <method> = function (<params>) { … }` with the given parameter names. ListNode {val,next} and TreeNode {val,left,right} exist as globals; return the shapes the signature expects. No imports, I/O, classes, async, or recursion when a loop is natural; prefer index loops (`for (let i = 0; …)`) over for-of so indices can be drawn as pointers; keep helper functions to a minimum. Use the standard approach an interviewer expects. Put every statement on its own line and end each statement line, including `for`, `while`, `if`, `else if` and `return` lines, with a short trailing `// comment` in plain English saying what that step does and why. Inside a comment, `{name}` shows a variable's current value, e.g. `if (seen.has(need)) { // Is {need} already in the map?`. Avoid Infinity, NaN and undefined as values.",
        input: JSON.stringify({
          title: problem.title,
          statement,
          signature,
          starter,
          examples,
          previousAttempt: feedback || undefined,
        }),
        max_output_tokens: 3000,
      },
      apiKey,
    );
    const code = stripFences(
      d.output
        ?.filter((o) => o.type === "message")
        .flatMap((o) => o.content)
        .filter((c) => c.type === "output_text")
        .map((c) => c.text)
        .join("\n") || "",
    );
    if (!code) continue;
    const check = await verifyReference(code, suite);
    if (check.ok) return code;
    feedback = `The previous attempt failed verification: ${String(
      check.output || check.error || "",
    ).slice(0, 1200)}`;
  }
  throw new Error(
    "Could not produce a verified reference solution for this problem.",
  );
}

// Compact numbered summary for the reasoning backend.
export function describeSteps(steps, { max = 60 } = {}) {
  const line = (s, i) =>
    `#${i + 1}${s.note ? " " + fillCaption(s.note, s.vars) : ""} — ` +
    Object.entries(s.vars)
      .filter(([, v]) => v.t !== "fn")
      .map(([k, v]) => `${k}=${briefValue(v)}`.slice(0, 60))
      .join(" ") +
    (s.ret ? ` → returns ${briefValue(s.ret)}` : "");
  if (steps.length <= max) return steps.map(line);
  const head = max - 10;
  return [
    ...steps.slice(0, head).map(line),
    `… ${steps.length - max} steps omitted …`,
    ...steps.slice(-10).map((s, i) => line(s, steps.length - 10 + i)),
  ];
}

// The whole thing: resolve a reference, trace the chosen case, and shape the
// result for the browser (data only) and for the backend (numbered text).
export async function runWalkthrough({
  problem,
  customTests,
  caseName,
  store,
  solutionsDir,
  openai,
  apiKey,
  model,
}) {
  const suite = walkthroughSuite(problem, customTests);
  if (!suite) throw new Error("This problem has no testcases to walk through.");
  const index = findCase(suite.cases, caseName);
  if (index < 0)
    throw new Error(
      `No testcase named "${caseName}". Available: ${suite.cases
        .map((c) => c.name)
        .slice(0, 12)
        .join(", ")}.`,
    );
  const slug = problem.slug || problem.titleSlug;
  let source = "curated";
  let code = await curatedReference(slug, solutionsDir);
  if (!code) {
    const cached = store?.getReference(slug);
    if (cached) {
      code = cached.code;
      source = cached.source;
    }
  }
  if (!code) {
    const verify = verificationSuite(problem);
    if (!verify)
      throw new Error(
        "This problem has no examples to verify a reference against.",
      );
    code = await generateReference(problem, verify, { openai, apiKey, model });
    source = "generated";
    store?.saveReference(slug, code, source);
  }
  const { approach, notes } = captions(code);
  const { steps, result } = await traceReference(code, suite, index);
  const shaped = steps.map(({ line, ...rest }) => ({
    ...rest,
    note: notes.get(line) || null,
  }));
  const testCase = suite.cases[index];
  const outcome = result.error
    ? `error: ${result.error}`
    : result.ok
      ? "passed"
      : "failed";
  return {
    client: {
      case: {
        name: testCase.name,
        input: testCase.input,
        expected: testCase.expected,
      },
      approach,
      steps: shaped,
      result: {
        ok: !!result.ok,
        error: result.error || null,
        actual: result.actual,
      },
    },
    forAgent: {
      case: testCase.name,
      input: testCase.input,
      expected: testCase.expected,
      approach,
      source,
      outcome,
      stepCount: shaped.length,
      steps: describeSteps(shaped),
    },
  };
}
