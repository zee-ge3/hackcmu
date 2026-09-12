self.onmessage = async ({ data: { code, language } }) => {
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
      await py.runPythonAsync(code);
    } else {
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
