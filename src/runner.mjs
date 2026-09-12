export function runCode(code, language, suite = null) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./runner.worker.js", import.meta.url), {
      type: "module",
    });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        output: "Execution timed out (15 seconds). Check for an infinite loop.",
      });
    }, 15000);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, output: e.message });
    };
    worker.postMessage({ code, language, suite });
  });
}
// Runs one prepared case under the tracer. `onSteps` receives snapshot batches
// while execution is still in progress; `stop()` abandons the run.
export function traceCode(code, language, suite, caseIndex, onSteps) {
  const worker = new Worker(new URL("./runner.worker.js", import.meta.url), {
    type: "module",
  });
  let finish;
  const done = new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          output:
            "Debugger timed out (15 seconds). Check for an infinite loop.",
        }),
      15000,
    );
    finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = (e) => {
      if (e.data.type === "steps") onSteps(e.data.steps);
      else finish(e.data.result);
    };
    worker.onerror = (e) => finish({ ok: false, output: e.message });
    worker.postMessage({ mode: "trace", code, language, suite, caseIndex });
  });
  return {
    done,
    stop: () => finish({ ok: false, output: "Debugger stopped." }),
  };
}
