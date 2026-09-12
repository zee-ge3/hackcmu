export function runCode(code, language) {
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
    worker.postMessage({ code, language });
  });
}
