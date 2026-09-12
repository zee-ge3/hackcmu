// approach: Two pointers moving inward on the sorted array
var twoSum = function (numbers, target) {
  let left = 0; // left starts at the smallest number
  let right = numbers.length - 1; // right starts at the largest
  while (left < right) { // Keep going while the pointers have not met
    const sum = numbers[left] + numbers[right]; // Add the two ends
    if (sum === target) { // Compare {sum} with the target
      return [left + 1, right + 1]; // Equal: the answer is both positions, 1-indexed
    } else if (sum < target) { // Not equal: is {sum} too small?
      left++; // Too small: move left up to a bigger number
    } else {
      right--; // Too big: move right down to a smaller number
    }
  }
  return []; // No pair (the problem guarantees one exists)
};
