// approach: Walk the list, pointing each node back at the previous one
var reverseList = function (head) {
  let prev = null; // The reversed part so far (empty)
  let cur = head; // The node being flipped
  while (cur) { // Until we run off the end
    const next = cur.next; // Save where to go next before changing anything
    cur.next = prev; // Flip this node's arrow to point backward
    prev = cur; // The reversed part now starts at this node
    cur = next; // Step forward to the saved node
  }
  return prev; // prev is the new head
};
