// approach: Two pointers: write marks the next slot for a non-zero
var moveZeroes = function (nums) {
  let write = 0; // The next position that should hold a non-zero
  for (let read = 0; read < nums.length; read++) { // read scans every element
    if (nums[read] !== 0) { // Is the value under read non-zero?
      const value = nums[read]; // Hold the non-zero value
      nums[read] = nums[write]; // Put whatever sits at write (a zero, or itself) here
      nums[write] = value; // Move the non-zero into the write slot
      write++; // The write slot moves on
    }
  }
};
