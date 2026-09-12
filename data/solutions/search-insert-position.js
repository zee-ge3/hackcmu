// approach: Binary search for the first index not smaller than target
var searchInsert = function (nums, target) {
  let lo = 0; // lo is the first index still possible
  let hi = nums.length - 1; // hi is the last index still possible
  while (lo <= hi) { // Search while the range from lo to hi is not empty
    const mid = Math.floor((lo + hi) / 2); // Look at the middle of the range
    if (nums[mid] === target) { // Compare the middle value with the target
      return mid; // Found it at index {mid}
    } else if (nums[mid] < target) { // Is the middle value smaller than the target?
      lo = mid + 1; // Yes: the answer is to the right of {mid}
    } else {
      hi = mid - 1; // No: the answer is at or left of {mid}
    }
  }
  return lo; // Not found: lo is where the target would be inserted
};
