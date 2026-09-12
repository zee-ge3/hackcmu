// Worker thread that runs a reference solution: either verifies it against a
// suite or traces one case, streaming snapshot batches. Running it off the
// main thread lets the server terminate a solution that loops forever.
import { parentPort, workerData } from "node:worker_threads";
import { runJavascriptTrace } from "../src/trace.mjs";
import { runJavascriptSuite } from "../src/judge.mjs";
const quiet = { log() {}, error() {}, warn() {}, assert() {} };
const { op, code, suite, caseIndex, limit } = workerData;
try {
  if (op === "verify")
    parentPort.postMessage({
      type: "done",
      result: runJavascriptSuite(code, suite, quiet),
    });
  else
    parentPort.postMessage({
      type: "done",
      result: runJavascriptTrace(code, suite, suite.cases[caseIndex], {
        onSteps: (steps) => parentPort.postMessage({ type: "steps", steps }),
        consoleObject: quiet,
        limit,
      }),
    });
} catch (e) {
  parentPort.postMessage({
    type: "done",
    result: { ok: false, error: e.message },
  });
}
