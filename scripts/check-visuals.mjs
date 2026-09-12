// Validates every prepared visual (data/probability/visuals/*.json): schema,
// a matching bank question, an answer the grader can parse, and (with
// --render DIR) a PNG of the final picture via scripts/render-sketch.py.
//   node scripts/check-visuals.mjs [--render /tmp/visuals-png] [--json]
import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { validateVisual } from "../server/visuals.mjs";
import { matchAnswer } from "../src/modes.mjs";
const root = new URL("../", import.meta.url);
const dir = new URL("data/probability/visuals/", root);
const args = process.argv.slice(2);
const renderDir = args.includes("--render")
  ? args[args.indexOf("--render") + 1]
  : null;
const bank = [
  ...JSON.parse(
    await readFile(new URL("data/probability/probability_bank.json", root)),
  ),
  ...(await readFile(
    new URL("data/probability/quantprof_extracted.json", root),
    "utf8",
  )
    .then((t) => JSON.parse(t))
    .catch(() => [])),
];
const byId = new Map(bank.map((q) => [q.id, q]));
const report = [];
for (const file of (await readdir(dir))
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const issues = [];
  let v = null;
  try {
    v = JSON.parse(await readFile(new URL(file, dir), "utf8"));
  } catch (e) {
    issues.push(`invalid JSON: ${e.message}`);
  }
  if (v) {
    issues.push(...validateVisual(v));
    const q = byId.get(v.id);
    if (!q) issues.push(`no bank question with id ${v.id}`);
    else {
      if (v.answer && matchAnswer(v.answer, v.answer) === null)
        issues.push(
          `answer ${JSON.stringify(v.answer)} is not a number the grader can parse`,
        );
      if (q.answer && v.answer && matchAnswer(v.answer, q.answer) === false)
        issues.push(`answer ${v.answer} disagrees with the bank's ${q.answer}`);
      if (!q.answer && !v.answer)
        issues.push("bank has no answer and the visual supplies none");
    }
    if (renderDir && !issues.length) {
      try {
        execFileSync("python3", [
          new URL("render-sketch.py", new URL("scripts/", root)).pathname,
          new URL(file, dir).pathname,
          `${renderDir}/${file.replace(/\.json$/, ".png")}`,
        ]);
      } catch (e) {
        issues.push(
          `render failed: ${String(e.stderr || e.message).slice(0, 200)}`,
        );
      }
    }
  }
  report.push({ file, id: v?.id, ok: !issues.length, issues });
}
const bad = report.filter((r) => !r.ok);
if (args.includes("--json")) console.log(JSON.stringify(report, null, 1));
else {
  for (const r of bad) console.log(`✗ ${r.file}: ${r.issues.join("; ")}`);
  console.log(`${report.length - bad.length}/${report.length} visuals valid`);
}
process.exit(bad.length ? 1 : 0);
