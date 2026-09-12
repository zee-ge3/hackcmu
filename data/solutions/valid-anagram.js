// approach: Count the letters of s, then use them up with t
var isAnagram = function (s, t) {
  if (s.length !== t.length) { // Different lengths can never be anagrams
    return false; // Lengths differ
  }
  const count = {}; // Letter to count, starting empty
  for (let i = 0; i < s.length; i++) { // Count every letter of s
    const c = s[i]; // The current letter of s
    count[c] = (count[c] || 0) + 1; // One more {c}
  }
  for (let j = 0; j < t.length; j++) { // Now walk t with j
    const d = t[j]; // The current letter of t
    if (!count[d]) { // Is there a {d} left to match?
      return false; // No: t has a letter s does not have enough of
    }
    count[d] -= 1; // Use one {d} up
  }
  return true; // Every letter matched
};
