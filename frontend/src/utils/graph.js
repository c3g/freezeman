/*
 * A class that represents a graph
 */
class Graph {
  /**
   * 
   * @param {any} data data
   * @param {any[]} edges array of [edge data, child graph]
   */
  constructor(data, edges = []) {
    this.data = data;
    this.edges = edges;
  }

  /**
   * Reduce neighbors into `this` with function `f`.
   * @param {(oldData: any, edges: any[]) => any} f reducer function
   */
  reduceNeighbors(f) {
    // visit neighbors first
    const neighbors = this.edges.map(([e, n]) => [e, n, n.reduceNeighbors(f)])

    // visit this node
    const newData = f(this.data, neighbors)

    return newData
  }
}

export default Graph;
