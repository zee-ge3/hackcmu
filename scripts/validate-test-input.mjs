import assert from "node:assert/strict";
// Bounds transcribed from the cached LeetCode statements. Validate before writing a suite.
export function validateInput(slug, input) {
  const [a, b] = input;
  const number = (x, min, max) =>
    assert.ok(
      Number.isInteger(x) && x >= min && x <= max,
      `${slug}: integer out of range`,
    );
  const vector = (v, minLength, maxLength, min, max) => {
    assert.ok(
      Array.isArray(v) && v.length >= minLength && v.length <= maxLength,
      slug + ": array length",
    );
    v.forEach((x) => number(x, min, max));
  };
  const sorted = () =>
    assert.ok(
      a.every((x, i) => !i || x >= a[i - 1]),
      slug + ": sorted input",
    );
  if (slug === "valid-anagram") {
    for (const s of input)
      assert.ok(typeof s === "string" && /^[a-z]{1,50000}$/.test(s));
    return;
  }
  if (slug === "valid-parentheses") {
    assert.ok(
      typeof a === "string" &&
        a.length >= 1 &&
        a.length <= 10000 &&
        /^[()[\]{}]+$/.test(a),
    );
    return;
  }
  if (slug === "merge-intervals") {
    assert.ok(a.length >= 1 && a.length <= 10000);
    a.forEach((row) => {
      vector(row, 2, 2, 0, 10000);
      assert.ok(row[0] <= row[1]);
    });
    return;
  }
  if (["maximum-depth-of-binary-tree", "invert-binary-tree"].includes(slug)) {
    vector(
      a.filter((x) => x !== null),
      0,
      slug === "invert-binary-tree" ? 100 : 10000,
      -100,
      100,
    );
    return;
  }
  const limits = {
    "two-sum": [2, 10000, -1e9, 1e9],
    "two-sum-ii-input-array-is-sorted": [2, 30000, -1000, 1000],
    "contains-duplicate": [1, 100000, -1e9, 1e9],
    "binary-search": [1, 10000, -9999, 9999],
    "search-insert-position": [1, 10000, -10000, 10000],
    "best-time-to-buy-and-sell-stock": [1, 100000, 0, 10000],
    "maximum-subarray": [1, 100000, -10000, 10000],
    "move-zeroes": [1, 10000, -2147483648, 2147483647],
    "reverse-linked-list": [0, 5000, -5000, 5000],
    "3sum": [3, 3000, -100000, 100000],
  };
  assert.ok(limits[slug], slug + ": unknown constraints");
  vector(a, ...limits[slug]);
  if (slug === "binary-search" || slug === "search-insert-position") {
    sorted();
    assert.equal(new Set(a).size, a.length);
    number(b, limits[slug][2], limits[slug][3]);
  }
  if (slug === "two-sum" || slug === "two-sum-ii-input-array-is-sorted") {
    number(b, limits[slug][2], limits[slug][3]);
    if (slug !== "two-sum") sorted();
    let solutions = 0;
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === b) solutions++;
    assert.equal(solutions, 1, slug + ": must have one valid pair");
  }
}
