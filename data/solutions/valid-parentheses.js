// approach: A stack of open brackets waiting for their closer
var isValid = function (s) {
  const stack = []; // Open brackets waiting for their closer
  const pair = { ")": "(", "]": "[", "}": "{" }; // Each closer and its opener
  for (let i = 0; i < s.length; i++) { // Read the string left to right
    const c = s[i]; // The current character
    if (c === "(" || c === "[" || c === "{") { // Is {c} an opener?
      stack.push(c); // Yes: push it and wait for its closer
    } else if (stack.length > 0 && stack[stack.length - 1] === pair[c]) { // Does the top of the stack match {c}?
      stack.pop(); // Matched: pop the opener
    } else {
      return false; // Closer {c} has nothing to match: invalid
    }
  }
  return stack.length === 0; // Valid only if nothing is left open
};
