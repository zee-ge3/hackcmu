// Line-level diff (LCS) used to highlight what an interviewer edit added.
export function lineDiff(before, after) {
  const a = before.split("\n"),
    b = after.split("\n");
  if (a.length > 600 || b.length > 600)
    return { added: [], removed: [], tooLarge: true };
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
  const added = [],
    removed = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) removed.push(i++ + 1);
    else added.push(j++ + 1);
  }
  while (i < a.length) removed.push(i++ + 1);
  while (j < b.length) added.push(j++ + 1);
  return { added, removed, tooLarge: false };
}
