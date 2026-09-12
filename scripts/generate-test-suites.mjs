import { mkdir, writeFile } from "node:fs/promises";
import { validateInput } from "./validate-test-input.mjs";
import assert from "node:assert/strict";
import { problems } from "./test-problems.mjs";
import { decode, encode, invokeJavascript, matches } from "../src/judge.mjs";
await mkdir(new URL("../data/test-suites/", import.meta.url), {
  recursive: true,
});
let count = 0;
for (const p of problems) {
  const suite = {
    version: 1,
    slug: p.slug,
    method: p.method,
    arguments: p.args,
    output: p.output,
    comparison: p.compare,
    provenance:
      "Deterministic offline cases. Expected values cross-checked between an independent oracle and reference implementation.",
    cases: [],
  };
  for (const [i, raw] of [...p.examples, ...p.extra, ...p.large].entries()) {
    const input = structuredClone(raw).map((v, j) =>
      p.args[j] === "tree" ? encode(decode(v, "tree"), "tree") : v,
    );
    assert.equal(input.length, p.args.length, p.slug + " argument count");
    validateInput(p.slug, input);
    const expected = p.oracle(...structuredClone(input));
    const actual = invokeJavascript(p.reference.toString(), suite, input);
    assert.ok(
      matches(actual, expected, p.compare),
      JSON.stringify({ slug: p.slug, input, actual, expected }),
    );
    suite.cases.push({
      id: `case-${i + 1}`,
      name:
        i >= p.examples.length + p.extra.length
          ? `Large input ${i - p.examples.length - p.extra.length + 1}`
          : i < p.examples.length
            ? `Example / boundary ${i + 1}`
            : `Generated case ${i - p.examples.length + 1}`,
      kind:
        i >= p.examples.length + p.extra.length
          ? "large"
          : i < p.examples.length
            ? "example"
            : "generated",
      input,
      expected,
    });
  }
  await writeFile(
    new URL(`../data/test-suites/${p.slug}.json`, import.meta.url),
    JSON.stringify(suite, null, 2) + "\n",
  );
  count += suite.cases.length;
}
console.log(
  `Generated and cross-checked ${count} test cases for ${problems.length} problems.`,
);
