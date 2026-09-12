// approach: One pass with a hash map of values already seen
var twoSum = function (nums, target) {
  const seen = new Map(); // Start with an empty map from value to index
  for (let i = 0; i < nums.length; i++) { // Walk the array once with i
    const need = target - nums[i]; // The partner for nums[i] is target minus nums[i]
    if (seen.has(need)) { // Is {need} already in the map?
      return [seen.get(need), i]; // Yes: that earlier index and i are the answer
    }
    seen.set(nums[i], i); // Not yet: remember this value and its index
  }
  return []; // No pair found
};
