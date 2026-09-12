// approach: Kadane: extend the current run or start over
var maxSubArray = function (nums) {
  let current = nums[0]; // Best sum of a run ending at the current index
  let best = nums[0]; // Best sum seen anywhere
  for (let i = 1; i < nums.length; i++) { // Move i through the rest of the array
    if (current < 0) { // Is the run so far ({current}) dragging us down?
      current = nums[i]; // Yes: start a fresh run at index i
    } else {
      current = current + nums[i]; // No: extend the run with nums[i]
    }
    if (current > best) { // Is the run ending here the best yet?
      best = current; // Yes: record {current}
    }
  }
  return best; // The largest subarray sum
};
