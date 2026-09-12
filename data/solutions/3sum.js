// approach: Sort, fix one number, two pointers for the other two
var threeSum = function (nums) {
  nums.sort((a, b) => a - b); // Sort so duplicates sit together and pointers can move by size
  const result = []; // Triplets found
  for (let i = 0; i < nums.length - 2; i++) { // Fix the first number at i
    if (i > 0 && nums[i] === nums[i - 1]) { // Same first number as before?
      continue; // Skip it to avoid duplicate triplets
    }
    let left = i + 1; // left starts just after i
    let right = nums.length - 1; // right starts at the end
    while (left < right) { // Move the two pointers toward each other
      const sum = nums[i] + nums[left] + nums[right]; // Sum of the three
      if (sum === 0) { // Does the triple sum to zero?
        result.push([nums[i], nums[left], nums[right]]); // Yes: record the triplet
        while (left < right && nums[left] === nums[left + 1]) { // Skip repeated values on the left
          left++; // Skip a duplicate
        }
        while (left < right && nums[right] === nums[right - 1]) { // Skip repeated values on the right
          right--; // Skip a duplicate
        }
        left++; // Move both pointers inward
        right--; // Move both pointers inward
      } else if (sum < 0) { // Is {sum} below zero?
        left++; // Yes: need a bigger number, move left up
      } else {
        right--; // {sum} is above zero: need a smaller number, move right down
      }
    }
  }
  return result; // All unique triplets
};
