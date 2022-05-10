/*
 * A class that represents a graph
 */
class Graph {
  constructor(data, neighbors = []) {
    this.data = data;
    this.neighbors = neighbors;
  }

  /**
   * Reduce neighbors into `this` with function `f`.
   * @param {(oldData: any, oldNeighbors: any[], newNeighbors: any[], visited: Set<any>) => any} f reducer function
   * @param {number} maxDepth maximum depth to search (max 25000?)
   * @param {boolean} skipVisited skip visited node in case of cycle in graph
   * @param {Set<Graph>} visited for internal use only
   */
  reduceNeighbors(f, maxDepth = 25000, skipVisited = false, visited = new Set()) {
    if (maxDepth == 0) {
      return f(this.data, [], [], visited)
    }

    // visit neighbors first
    const newNeighbors = this.neighbors
      .filter((n) => !skipVisited && !visited.has(n))
      .map((n) => n.reduceNeighbors(f, maxDepth-1, skipVisited, visited))
    this.neighbors.forEach((n) => visited.add(n))

    // visit this node
    const newData = f(this.data, this.neighbors, newNeighbors, visited)
    visited.add(this)

    return newData
  }
}

export default Graph;
