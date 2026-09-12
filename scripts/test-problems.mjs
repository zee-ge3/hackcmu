// Offline-only reference implementations and independent oracles. Never shipped in suites.
let seed = 260911;
const random = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const array = (n, min = -20, max = 20) =>
  Array.from({ length: n }, () => min + random(max - min + 1));
const ints = () => array(1 + random(35));
const str = () =>
  Array.from({ length: 1 + random(25) }, () =>
    String.fromCharCode(97 + random(6)),
  ).join("");
const many = (fn) => Array.from({ length: 40 }, fn);
const pairs = (a, t) => {
  const out = [];
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++)
      if (a[i] + a[j] === t) out.push([i, j]);
  return out;
};
const sumCases = () => {
  const result = [];
  while (result.length < 40) {
    const a = ints();
    if (a.length < 2) continue;
    const t = a[0] + a[a.length - 1];
    if (pairs(a, t).length === 1) result.push([a, t]);
  }
  return result;
};
const trees = () =>
  many(() => {
    const a = [random(21) - 10];
    for (let i = 0; i < 1 + random(25); i++)
      a.push(random(4) ? random(21) - 10 : null);
    return [a];
  });
const def = (
  slug,
  method,
  args,
  output,
  examples,
  extra,
  reference,
  oracle,
  compare = "exact",
) => ({
  slug,
  method,
  args,
  output,
  examples,
  extra,
  reference,
  oracle,
  compare,
});
export const problems = [
  def(
    "two-sum",
    "twoSum",
    ["json", "json"],
    "json",
    [
      [[2, 7, 11, 15], 9],
      [[3, 2, 4], 6],
      [[3, 3], 6],
    ],
    sumCases(),
    function twoSum(nums, target) {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
      }
    },
    (a, t) => pairs(a, t)[0],
    "unordered",
  ),
  def(
    "two-sum-ii-input-array-is-sorted",
    "twoSum",
    ["json", "json"],
    "json",
    [
      [[2, 7, 11, 15], 9],
      [[-1, 0], -1],
      [[0, 0], 0],
    ],
    sumCases().map(([a, t]) => [a.sort((x, y) => x - y), t]),
    function twoSum(a, t) {
      let l = 0,
        r = a.length - 1;
      while (l < r) {
        if (a[l] + a[r] === t) return [l + 1, r + 1];
        if (a[l] + a[r] < t) l++;
        else r--;
      }
    },
    (a, t) => pairs(a, t)[0].map((i) => i + 1),
    "exact",
  ),
  def(
    "contains-duplicate",
    "containsDuplicate",
    ["json"],
    "json",
    [[[1, 2, 3, 1]], [[1, 2, 3, 4]], [[0]], [[0, 0]]],
    many(() => [ints()]),
    function containsDuplicate(a) {
      return new Set(a).size !== a.length;
    },
    (a) => a.some((x, i) => a.slice(i + 1).includes(x)),
  ),
  def(
    "valid-anagram",
    "isAnagram",
    ["json", "json"],
    "json",
    [
      ["anagram", "nagaram"],
      ["rat", "car"],
      ["a", "a"],
      ["ab", "a"],
    ],
    many(() => {
      const s = str();
      return [s, random(2) ? s.split("").reverse().join("") : str()];
    }),
    function isAnagram(s, t) {
      if (s.length !== t.length) return false;
      const counts = {};
      for (const c of s) counts[c] = (counts[c] || 0) + 1;
      for (const c of t) {
        if (!counts[c]) return false;
        counts[c]--;
      }
      return true;
    },
    (s, t) => s.split("").sort().join("") === t.split("").sort().join(""),
  ),
  def(
    "valid-parentheses",
    "isValid",
    ["json"],
    "json",
    [["()"], ["()[]{}"], ["(]"], ["([)]"], ["{[]}"], ["("], [")"]],
    many(() => {
      let s = "";
      for (let i = 0; i < 1 + random(25); i++) s += "()[]{}"[random(6)];
      return [s];
    }),
    function isValid(s) {
      const stack = [],
        close = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) {
        if (close[c]) {
          if (stack.pop() !== close[c]) return false;
        } else stack.push(c);
      }
      return stack.length === 0;
    },
    (s) => {
      let prev;
      do {
        prev = s;
        s = s.replaceAll("()", "").replaceAll("[]", "").replaceAll("{}", "");
      } while (s !== prev);
      return s === "";
    },
  ),
  def(
    "binary-search",
    "search",
    ["json", "json"],
    "json",
    [
      [[-1, 0, 3, 5, 9, 12], 9],
      [[-1, 0, 3, 5, 9, 12], 2],
      [[5], 5],
      [[5], -1],
    ],
    many(() => {
      const a = [...new Set(ints())].sort((a, b) => a - b);
      return [a, random(2) ? a[random(a.length)] : random(50) - 25];
    }),
    function search(a, t) {
      let l = 0,
        r = a.length - 1;
      while (l <= r) {
        const m = (l + r) >> 1;
        if (a[m] === t) return m;
        if (a[m] < t) l = m + 1;
        else r = m - 1;
      }
      return -1;
    },
    (a, t) => a.indexOf(t),
  ),
  def(
    "search-insert-position",
    "searchInsert",
    ["json", "json"],
    "json",
    [
      [[1, 3, 5, 6], 5],
      [[1, 3, 5, 6], 2],
      [[1, 3, 5, 6], 7],
      [[1], 0],
    ],
    many(() => [[...new Set(ints())].sort((a, b) => a - b), random(50) - 25]),
    function searchInsert(a, t) {
      let l = 0,
        r = a.length;
      while (l < r) {
        const m = (l + r) >> 1;
        if (a[m] < t) l = m + 1;
        else r = m;
      }
      return l;
    },
    (a, t) => a.filter((x) => x < t).length,
  ),
  def(
    "best-time-to-buy-and-sell-stock",
    "maxProfit",
    ["json"],
    "json",
    [[[7, 1, 5, 3, 6, 4]], [[7, 6, 4, 3, 1]], [[0]], [[2, 2, 2]]],
    many(() => [array(1 + random(35), 0, 100)]),
    function maxProfit(a) {
      let low = Infinity,
        best = 0;
      for (const p of a) {
        low = Math.min(low, p);
        best = Math.max(best, p - low);
      }
      return best;
    },
    (a) => {
      let best = 0;
      for (let i = 0; i < a.length; i++)
        for (let j = i + 1; j < a.length; j++)
          best = Math.max(best, a[j] - a[i]);
      return best;
    },
  ),
  def(
    "maximum-subarray",
    "maxSubArray",
    ["json"],
    "json",
    [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[1]], [[-8, -3, -6, -2]], [[0, 0]]],
    many(() => [ints()]),
    function maxSubArray(a) {
      let best = a[0],
        ending = a[0];
      for (let i = 1; i < a.length; i++) {
        ending = Math.max(a[i], ending + a[i]);
        best = Math.max(best, ending);
      }
      return best;
    },
    (a) => {
      let best = -Infinity;
      for (let i = 0; i < a.length; i++) {
        let sum = 0;
        for (let j = i; j < a.length; j++) {
          sum += a[j];
          best = Math.max(best, sum);
        }
      }
      return best;
    },
  ),
  def(
    "move-zeroes",
    "moveZeroes",
    ["json"],
    "argument:0",
    [[[0, 1, 0, 3, 12]], [[0]], [[1, 2, 3]], [[0, 0, 0]]],
    many(() => [array(1 + random(35), -2, 2)]),
    function moveZeroes(a) {
      let j = 0;
      for (let i = 0; i < a.length; i++)
        if (a[i] !== 0) {
          const temp = a[j];
          a[j] = a[i];
          a[i] = temp;
          j++;
        }
    },
    (a) => [...a.filter((x) => x !== 0), ...a.filter((x) => x === 0)],
  ),
  def(
    "merge-intervals",
    "merge",
    ["json"],
    "json",
    [
      [
        [
          [1, 3],
          [2, 6],
          [8, 10],
          [15, 18],
        ],
      ],
    ],
    [
      [
        [
          [1, 4],
          [4, 5],
        ],
      ],
      [
        [
          [1, 4],
          [2, 3],
        ],
      ],
      [[[0, 0]]],
      ...many(() => [
        Array.from({ length: 1 + random(15) }, () => {
          const a = random(20),
            b = random(20);
          return [Math.min(a, b), Math.max(a, b)];
        }),
      ]),
    ],
    function merge(a) {
      a.sort((x, y) => x[0] - y[0]);
      const out = [];
      for (const pair of a) {
        if (out.length && pair[0] <= out.at(-1)[1])
          out.at(-1)[1] = Math.max(out.at(-1)[1], pair[1]);
        else out.push([...pair]);
      }
      return out;
    },
    (a) => {
      let work = a.map((x) => [...x]),
        changed = true;
      while (changed) {
        changed = false;
        outer: for (let i = 0; i < work.length; i++)
          for (let j = i + 1; j < work.length; j++)
            if (
              Math.max(work[i][0], work[j][0]) <=
              Math.min(work[i][1], work[j][1])
            ) {
              work[i] = [
                Math.min(work[i][0], work[j][0]),
                Math.max(work[i][1], work[j][1]),
              ];
              work.splice(j, 1);
              changed = true;
              break outer;
            }
      }
      return work;
    },
    "unordered",
  ),
  def(
    "reverse-linked-list",
    "reverseList",
    ["list"],
    "list",
    [[[1, 2, 3, 4, 5]], [[]], [[1]], [[1, 2]]],
    many(() => [array(random(30))]),
    function reverseList(head) {
      let prev = null;
      while (head) {
        const next = head.next;
        head.next = prev;
        prev = head;
        head = next;
      }
      return prev;
    },
    (a) => [...a].reverse(),
  ),
  def(
    "maximum-depth-of-binary-tree",
    "maxDepth",
    ["tree"],
    "json",
    [[[3, 9, 20, null, null, 15, 7]], [[]], [[1]], [[1, null, 2, null, 3]]],
    trees(),
    function maxDepth(root) {
      if (!root) return 0;
      return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    },
    (a) => {
      if (!a.length || a[0] === null) return 0;
      const depths = [1];
      let read = 0,
        max = 1;
      for (let i = 1; i < a.length && read < depths.length;) {
        const depth = depths[read++];
        for (let child = 0; child < 2 && i < a.length; child++, i++)
          if (a[i] !== null) {
            depths.push(depth + 1);
            max = Math.max(max, depth + 1);
          }
      }
      return max;
    },
  ),
  def(
    "invert-binary-tree",
    "invertTree",
    ["tree"],
    "tree",
    [[[4, 2, 7, 1, 3, 6, 9]], [[]], [[1]], [[1, 2, 3, null, 4]]],
    trees(),
    function invertTree(root) {
      if (root) {
        const left = invertTree(root.left);
        root.left = invertTree(root.right);
        root.right = left;
      }
      return root;
    },
    (a) => {
      if (!a.length || a[0] === null) return [];
      const nodes = [{ val: a[0] }];
      let read = 0;
      for (let i = 1; i < a.length && read < nodes.length;) {
        const n = nodes[read++];
        for (const side of ["left", "right"]) {
          if (i < a.length && a[i] !== null) {
            n[side] = { val: a[i] };
            nodes.push(n[side]);
          }
          i++;
        }
      }
      const queue = [nodes[0]],
        out = [];
      for (let i = 0; i < queue.length; i++) {
        const n = queue[i];
        out.push(n ? n.val : null);
        if (n) queue.push(n.right, n.left);
      }
      while (out.at(-1) === null) out.pop();
      return out;
    },
  ),
  def(
    "3sum",
    "threeSum",
    ["json"],
    "json",
    [[[-1, 0, 1, 2, -1, -4]], [[0, 1, 1]], [[0, 0, 0]], [[0, 0, 0, 0]]],
    many(() => [array(3 + random(20), -8, 8)]),
    function threeSum(a) {
      a.sort((a, b) => a - b);
      const out = [];
      for (let i = 0; i < a.length - 2; i++) {
        if (i && a[i] === a[i - 1]) continue;
        let l = i + 1,
          r = a.length - 1;
        while (l < r) {
          const sum = a[i] + a[l] + a[r];
          if (sum === 0) {
            out.push([a[i], a[l], a[r]]);
            const left = a[l],
              right = a[r];
            while (l < r && a[l] === left) l++;
            while (l < r && a[r] === right) r--;
          } else if (sum < 0) l++;
          else r--;
        }
      }
      return out;
    },
    (a) => {
      const found = new Map();
      for (let i = 0; i < a.length; i++)
        for (let j = i + 1; j < a.length; j++)
          for (let k = j + 1; k < a.length; k++)
            if (a[i] + a[j] + a[k] === 0) {
              const row = [a[i], a[j], a[k]].sort((a, b) => a - b);
              found.set(JSON.stringify(row), row);
            }
      return [...found.values()];
    },
    "triplets",
  ),
];

const largeCases = {
  "two-sum": [[Array.from({ length: 2000 }, (_, i) => i), 3997]],
  "two-sum-ii-input-array-is-sorted": [
    [[...Array(1998).fill(0), 499, 500], 999],
  ],
  "contains-duplicate": [
    [Array.from({ length: 2000 }, (_, i) => i)],
    [Array.from({ length: 2000 }, (_, i) => i % 1999)],
  ],
  "valid-anagram": [["abc".repeat(2000), "cba".repeat(2000)]],
  "valid-parentheses": [["(".repeat(1000) + ")".repeat(1000)]],
  "binary-search": [[Array.from({ length: 2000 }, (_, i) => i * 2), 3998]],
  "search-insert-position": [
    [Array.from({ length: 2000 }, (_, i) => i * 2), 3999],
  ],
  "best-time-to-buy-and-sell-stock": [
    [Array.from({ length: 1000 }, (_, i) => 1000 - i)],
  ],
  "maximum-subarray": [
    [Array.from({ length: 1000 }, (_, i) => (i % 3 === 0 ? -2 : 1))],
  ],
  "move-zeroes": [[Array.from({ length: 2000 }, (_, i) => (i % 2 ? i : 0))]],
  "merge-intervals": [
    [Array.from({ length: 500 }, (_, i) => [i * 3, i * 3 + 1])],
  ],
  "reverse-linked-list": [[Array.from({ length: 1000 }, (_, i) => i)]],
  "maximum-depth-of-binary-tree": [
    [Array.from({ length: 2047 }, (_, i) => (i % 201) - 100)],
  ],
  "invert-binary-tree": [[Array.from({ length: 100 }, (_, i) => i - 50)]],
  "3sum": [[Array.from({ length: 120 }, (_, i) => i - 60)]],
};
for (const p of problems) p.large = largeCases[p.slug];
