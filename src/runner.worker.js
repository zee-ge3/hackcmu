import { runJavascriptSuite, matches, summarize } from "./judge.mjs";
import { pythonJudge } from "./python-judge.mjs";
self.onmessage = async ({ data: { code, language, suite } }) => {
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
    if (language === "python3") {
      const pyodideUrl = "/pyodide/pyodide.mjs";
      const { loadPyodide } = await import(/* @vite-ignore */ pyodideUrl);
      const py = await loadPyodide({
        indexURL: "/pyodide/",
        stdout: log,
        stderr: log,
      });
      if (suite) {
        py.globals.set("__candidate_code", code);
        py.globals.set("__suite_json", JSON.stringify(suite));
        const raw = JSON.parse(await py.runPythonAsync(pythonJudge));
        const results = raw.map((r, i) => ({
          ...suite.cases[i],
          ...r,
          passed:
            !r.error &&
            matches(r.actual, suite.cases[i].expected, suite.comparison),
        }));
        self.postMessage(summarize(suite, results));
        return;
      }
      await py.runPythonAsync(code);
    } else {
      if (suite) {
        self.postMessage(
          runJavascriptSuite(code, suite, {
            log,
            error: log,
            warn: log,
            assert: (value, ...args) => {
              if (!value)
                throw new Error("Assertion failed: " + args.join(" "));
            },
          }),
        );
        return;
      }
      const value = await new Function("console", `"use strict";\n${code}`)({
        log,
        error: log,
        warn: log,
        assert: (condition, ...args) => {
          if (!condition)
            throw new Error("Assertion failed: " + args.join(" "));
        },
      });
      if (value !== undefined) log(value);
    }
    self.postMessage({
      ok: true,
      output:
        lines.join("\n") ||
        "Code finished without output. Add example calls or assertions to test your solution.",
    });
  } catch (e) {
    self.postMessage({ ok: false, output: [...lines, e.message].join("\n") });
  }
};
