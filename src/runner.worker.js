import { runJavascriptSuite, matches, summarize } from "./judge.mjs";
import { pythonJudge, pythonTracer } from "./python-judge.mjs";
import { runJavascriptTrace } from "./trace.mjs";
const makeConsole = (log) => ({
  log,
  error: log,
  warn: log,
  assert: (value, ...args) => {
    if (!value) throw new Error("Assertion failed: " + args.join(" "));
  },
});
async function loadPython(log) {
  const pyodideUrl = "/pyodide/pyodide.mjs";
  const { loadPyodide } = await import(/* @vite-ignore */ pyodideUrl);
  return loadPyodide({ indexURL: "/pyodide/", stdout: log, stderr: log });
}
const describe = (value) => {
  const text = JSON.stringify(value);
  return text === undefined
    ? "undefined"
    : text.length > 200
      ? text.slice(0, 200) + "…"
      : text;
};
// Debugger mode: run one case with tracing and stream snapshot batches as they
// are produced, so the visualizer can follow execution in real time.
async function trace({ code, language, suite, caseIndex }, log, lines) {
  const testCase = suite.cases[caseIndex];
  const onSteps = (steps) => self.postMessage({ type: "steps", steps });
  let result;
  if (language === "python3") {
    const py = await loadPython(log);
    py.globals.set("__candidate_code", code);
    py.globals.set("__suite_json", JSON.stringify(suite));
    py.globals.set("__case_json", JSON.stringify(testCase));
    py.globals.set("__emit", (json) => onSteps(JSON.parse(json)));
    const raw = JSON.parse(await py.runPythonAsync(pythonTracer));
    result = raw.error
      ? {
          ok: false,
          steps: raw.steps,
          error: raw.error,
          expected: testCase.expected,
        }
      : {
          ok: matches(raw.actual, testCase.expected, suite.comparison),
          steps: raw.steps,
          actual: raw.actual,
          expected: testCase.expected,
        };
  } else
    result = runJavascriptTrace(code, suite, testCase, {
      onSteps,
      consoleObject: makeConsole(log),
    });
  const output =
    (result.error
      ? `Error: ${result.error}`
      : `${result.ok ? "PASS" : "FAIL"} · expected ${describe(result.expected)} · received ${describe(result.actual)}`) +
    (lines.length ? "\n" + lines.join("\n") : "");
  return { ...result, name: testCase.name, output };
}
self.onmessage = async ({ data }) => {
  const { code, language, suite, mode } = data;
  const lines = [];
  const log = (...args) => {
    if (lines.join("\n").length < 50000)
      lines.push(
        args
          .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
          .join(" "),
      );
  };
  try {
    if (mode === "trace") {
      const result = await trace(data, log, lines);
      self.postMessage({ type: "done", result });
      return;
    }
    if (language === "python3") {
      const py = await loadPython(log);
      if (suite) {
        py.globals.set("__candidate_code", code);
        py.globals.set("__suite_json", JSON.stringify(suite));
        const raw = JSON.parse(await py.runPythonAsync(pythonJudge));
        const results = raw.map((r, i) => ({
          ...suite.cases[i],
          ...r,
          passed: r.error
            ? false
            : "expected" in suite.cases[i]
              ? matches(r.actual, suite.cases[i].expected, suite.comparison)
              : null,
        }));
        self.postMessage({
          ...summarize(suite, results),
          stdout: lines.join("\n"),
        });
        return;
      }
      await py.runPythonAsync(code);
    } else {
      if (suite) {
        self.postMessage({
          ...runJavascriptSuite(code, suite, makeConsole(log)),
          stdout: lines.join("\n"),
        });
        return;
      }
      const value = await new Function("console", `"use strict";\n${code}`)(
        makeConsole(log),
      );
      if (value !== undefined) log(value);
    }
    self.postMessage({
      ok: true,
      output:
        lines.join("\n") ||
        "Code finished without output. Add example calls or assertions to test your solution.",
    });
  } catch (e) {
    const failure = { ok: false, output: [...lines, e.message].join("\n") };
    self.postMessage(
      mode === "trace" ? { type: "done", result: failure } : failure,
    );
  }
};
