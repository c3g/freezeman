/*
 * A class that represents the tree data structure
 */
class Tree {
  constructor(data, children = []) {
    this.data = data;
    this.neighbors = children;
  }

  /*
   * Performs a right fold with function f.
   * The f is a function that takes the data
   * of current node and a list of children
   * transformed by f
   */
  fold(f) {
    return f(
      this.data,
      this.neighbors.map((v) => v.fold(f))
    )
  }
}

export default Tree;
