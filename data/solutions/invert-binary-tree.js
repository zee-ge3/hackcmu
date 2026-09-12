// approach: Swap the children of every node, top down
var invertTree = function (root) {
  const stack = root ? [root] : []; // Nodes whose children still need swapping
  while (stack.length > 0) { // Until every node has been handled
    const node = stack.pop(); // Take the next node
    const temp = node.left; // Hold the left child
    node.left = node.right; // The right child becomes the left
    node.right = temp; // The held left child becomes the right
    if (node.left) { // Is there a left child now?
      stack.push(node.left); // It needs its own children swapped
    }
    if (node.right) { // Is there a right child now?
      stack.push(node.right); // It needs its own children swapped
    }
  }
  return root; // The same tree, mirrored
};
