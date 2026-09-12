// approach: Level-order traversal, counting levels
var maxDepth = function (root) {
  if (root === null) { // Is the tree empty?
    return 0; // An empty tree has depth 0
  }
  let depth = 0; // Levels completed so far
  let level = [root]; // The nodes on the current level
  while (level.length > 0) { // While there is a level to process
    depth++; // One more level exists
    const nextLevel = []; // Children of this level
    for (let i = 0; i < level.length; i++) { // Visit each node on the level
      const node = level[i]; // The current node
      if (node.left) { // Does it have a left child?
        nextLevel.push(node.left); // It belongs to the next level
      }
      if (node.right) { // Does it have a right child?
        nextLevel.push(node.right); // It belongs to the next level
      }
    }
    level = nextLevel; // Move down one level
  }
  return depth; // The number of levels
};
