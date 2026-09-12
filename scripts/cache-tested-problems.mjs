import { readFile, writeFile, access } from "node:fs/promises";
const catalog = JSON.parse(
  await readFile(new URL("../data/leetcode.json", import.meta.url)),
);
const { problems } = await import("./test-problems.mjs");
for (const { slug, method } of problems) {
  const path = new URL(`../data/details/${slug}.json`, import.meta.url);
  try {
    await access(path);
  } catch {
    const r = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "query($slug:String!){question(titleSlug:$slug){title content codeSnippets{langSlug code} sampleTestCase exampleTestcaseList metaData}}",
        variables: { slug },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!d.data?.question?.content)
      throw new Error(`Statement unavailable: ${slug}`);
    await writeFile(path, JSON.stringify(d.data.question, null, 2) + "\n");
  }
  const p = JSON.parse(await readFile(path));
  const meta =
    typeof p.metaData === "string" ? JSON.parse(p.metaData) : p.metaData;
  if (meta.name !== method)
    throw new Error(`Entry point mismatch: ${slug}: ${meta.name} vs ${method}`);
  if (!catalog.some((p) => p.slug === slug))
    throw new Error(`Missing catalog entry: ${slug}`);
  console.log(`Cached and checked entry point: ${slug}`);
}
