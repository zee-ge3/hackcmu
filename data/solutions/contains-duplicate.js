// approach: A set of the values seen so far
var containsDuplicate = function (nums) {
  const seen = new Set(); // Start with an empty set
  for (let i = 0; i < nums.length; i++) { // Move i across the array
    const num = nums[i]; // The current value
    if (seen.has(num)) { // Have we already seen {num}?
      return true; // Yes: {num} is a duplicate
    }
    seen.add(num); // No: remember {num} and continue
  }
  return false; // Every value was new
};
