// approach: Binary search, halving the range each step
var search = function (nums, target) {
  let lo = 0; // lo is the first index still possible
  let hi = nums.length - 1; // hi is the last index still possible
  while (lo <= hi) { // Search while the range from lo to hi is not empty
    const mid = Math.floor((lo + hi) / 2); // Look at the middle of the range
    if (nums[mid] === target) { // Compare the middle value with the target
      return mid; // Found it at index {mid}
    } else if (nums[mid] < target) { // Is the middle value smaller than the target?
      lo = mid + 1; // Yes: the target must be to the right of {mid}
    } else {
      hi = mid - 1; // No, it is bigger: the target must be to the left of {mid}
    }
  }
  return -1; // The range is empty: the target is not in the array
};
