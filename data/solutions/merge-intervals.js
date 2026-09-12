// approach: Sort by start, then merge overlapping neighbours
var merge = function (intervals) {
  intervals.sort((a, b) => a[0] - b[0]); // Sort the intervals by start
  const merged = []; // The merged intervals built so far
  for (let i = 0; i < intervals.length; i++) { // Visit the intervals in start order
    const current = intervals[i]; // The interval to place
    const last = merged[merged.length - 1]; // The most recent merged interval
    if (last && current[0] <= last[1]) { // Does {current} start before the last one ends?
      last[1] = Math.max(last[1], current[1]); // Overlap: extend the last interval's end
    } else {
      merged.push(current); // No overlap: start a new merged interval
    }
  }
  return merged; // All merged intervals
};
