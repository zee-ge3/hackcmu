// Line-level LCS alignment of two texts, as an ordered list of operations
// (keep / del / add). Used to highlight what an interviewer edit added and to
// type that edit into the editor one line at a time.
export function lineOps(before, after) {
  const a = before.split("\n"),
    b = after.split("\n");
  if (a.length > 600 || b.length > 600) return null;
  const dp = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ op: "keep", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1])
      ops.push({ op: "del", text: a[i++] });
    else ops.push({ op: "add", text: b[j++] });
  }
  while (i < a.length) ops.push({ op: "del", text: a[i++] });
  while (j < b.length) ops.push({ op: "add", text: b[j++] });
  return ops;
}
// Line numbers (1-based) added to `after` and removed from `before`.
export function lineDiff(before, after) {
  const ops = lineOps(before, after);
  if (!ops) return { added: [], removed: [], tooLarge: true };
  const added = [],
    removed = [];
  let i = 0,
    j = 0;
  for (const o of ops) {
    if (o.op === "keep") {
      i++;
      j++;
    } else if (o.op === "del") removed.push(++i);
    else added.push(++j);
  }
  return { added, removed, tooLarge: false };
}
