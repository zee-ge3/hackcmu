#!/usr/bin/env node
// Builds data/lists.json (Blind 75 and NeetCode 150 membership plus NeetCode
// pattern) from the public neetcode-gh/leetcode site data, validated against
// the local catalog slugs.
import { readFile, writeFile } from "node:fs/promises";
const source =
  "https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json";
const catalog = JSON.parse(
  await readFile(new URL("../data/leetcode.json", import.meta.url)),
);
const slugs = new Set(catalog.map((p) => p.slug));
const byNumber = new Map(catalog.map((p) => [p.id, p.slug]));
const rows = await (
  await fetch(source, { signal: AbortSignal.timeout(30000) })
).json();
const lists = { blind75: [], neetcode150: [], patterns: {} };
const missing = [];
for (const row of rows) {
  const linkSlug = row.link?.replace(/\/$/, "").split("/").pop();
  const number = Number(row.code?.split("-")[0]);
  const slug = slugs.has(linkSlug) ? linkSlug : byNumber.get(number);
  if (!slug) {
    if (row.blind75 || row.neetcode150) missing.push(row.problem);
    continue;
  }
  if (row.blind75) lists.blind75.push(slug);
  if (row.neetcode150) lists.neetcode150.push(slug);
  if (row.pattern && (row.blind75 || row.neetcode150))
    lists.patterns[slug] = row.pattern;
}
await writeFile(
  new URL("../data/lists.json", import.meta.url),
  JSON.stringify(lists, null, 1) + "\n",
);
console.log(
  `blind75 ${lists.blind75.length}, neetcode150 ${lists.neetcode150.length}, unmatched ${missing.length}${missing.length ? ": " + missing.join(", ") : ""}`,
);
