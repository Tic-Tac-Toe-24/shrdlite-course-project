///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

import arrays = collections.arrays;
import ICompareFunction = collections.ICompareFunction;
import IEqualsFunction = collections.IEqualsFunction;
import Set = collections.Set;
import Dictionary = collections.Dictionary;
import LinkedList = collections.LinkedList;

import compareToEquals = collections.compareToEquals;
import defaultCompare = collections.defaultCompare;
import defaultEquals = collections.defaultEquals;

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

/** An edge in a graph. */
class Edge<Node> {
  from: Node;
  to: Node;
  cost: number;
}

/** A directed graph. */
interface Graph<Node> {
  /** Computes the edges that leave from a node. */
  outgoingEdges(node: Node): Edge<Node>[];
  /** A function that compares nodes. */
  compareNodes: ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
  /** The path (sequence of Nodes) found by the search algorithm. */
  path: Node[];
  /** The total cost of the path. */
  cost: number;
}



function biDirectionalSearch<Node>(
  graph: Graph<Node>,
  start: Node,
  goal: (n: Node) => boolean,
  heuristics: (n: Node) => number,
  timeout: number
): SearchResult<Node> {
  let result: SearchResult<Node> = {
    path: [start],
    cost: 0
  };
  // goalstate with guessing and checking PL
  // implement two A* from each side

  return null;
}


/**
 * Calculates the most optimal path from start to goal in the graph, using
 * provided heuristics.
 * @param  {Graph<Node>}     graph      the graph on which to perform A\* search
 * @param  {Node}            start      the initial node
 * @param  {Node => boolean} goal       a function that returns true when given
 *                  										a goal node, used to determine if the
 *                  										algorithm has reached the goal.
 * @param  {Node => number}  heuristics the heuristic function, used to estimate
 *                  										the cost of reaching the goal from a
 *                  										given Node.
 * @param  {number}          timeout    maximum time (in seconds) to spend
 *                                      performing A\* search
 * @return {SearchResult<Node>}         a search result, which contains the path
 *                                      from `start` to a node satisfying `goal`
 *                                      and the cost of this path
 */
function aStarSearch<Node>(
  graph: Graph<Node>,
  start: Node,
  goal: (n: Node) => boolean,
  heuristics: (n: Node) => number,
  timeout: number
): SearchResult<Node> {
  let result: SearchResult<Node> = {
    path: [start],
    cost: 0
  };

  let startTime: number = -Date.now();
  timeout *= 1000;

  // The set of closed nodes.
  let closedNodes: Set<Node> = new Set<Node>();
  // The nodes g-costs.
  let costs: Dictionary<Node, number> = new Dictionary<Node, number>();
  // The nodes predecessor.
  let predecessors: Dictionary<Node, Node> = new Dictionary<Node, Node>();

  // Returns the f-value of a Node.
  let getF = function(node: Node): number{
    return heuristics(node) + costs.getValue(node);
  }

  // Comparison of 2 Nodes, where they are never the same.
  let compareFValue: ICompareFunction<Node> = function(first, second) {
    let difference = getF(first) - getF(second);
    if (difference != 0) {
      return difference;
    } else {
      return 1;
    }
  }

  // The set of open nodes.
  let openNodes: Heap<Node> =
    new Heap<Node>(compareFValue, compareToEquals(graph.compareNodes));

  // Add start to the set of open nodes, including setting its g-cost and predecessor.
  predecessors.setValue(start, start);
  costs.setValue(start, 0);
  openNodes.add(start);

  // Continues looking through the set of open nodes as long as theres any left.
  while (!openNodes.isEmpty()) {
    if (!((startTime + Date.now()) < timeout)) {
      // Throws an exception in case of timed out
      throw new TimeOutException(timeout);
    }
    let currentNode = openNodes.removeRoot();
    closedNodes.add(currentNode);

    // Optimal path found.
    if (goal(currentNode)) {
      let path: LinkedList<Node> = new LinkedList<Node>();
      // Collects path nodes
      while (!path.contains(start)) {
        path.add(currentNode);
        currentNode = predecessors.getValue(currentNode);
      }
      // Creates result.
      result.path = path.toArray().reverse();
      result.cost = costs.getValue(result.path[result.path.length-1]);
      break;
    }

    // Goes through every neighbouring node.
    for (let edge of graph.outgoingEdges(currentNode)) {
      if (!closedNodes.contains(edge.to)) {
        // Found the currently most optimal path to the neighbour.
        if (!costs.containsKey(edge.to) || costs.getValue(currentNode)
          + edge.cost < costs.getValue(edge.to)) {
          // Sets the neighbours predecessor to the current Node.
          predecessors.setValue(edge.to, currentNode);

          // Sets the g-cost for the neighbour.
          costs.setValue(edge.to, costs.getValue(currentNode) + edge.cost);

          // Adds or updates the position in the heap.
          if (!openNodes.contains(edge.to)) {
            openNodes.add(edge.to);
          } else {
            openNodes.update(edge.to);
          }
        }
      }
    }
  }

  return result;
}

// TimeOut exception
class TimeOutException {
  status: number;
  message: string = "Timed Out";
  constructor (status: number) {
    this.status = status;
  }
}

/**
 * Modified Heap datastructure used to represent the open set of nodes.
 */
class Heap<T> {
  private data: T[] = [];
  private compare: ICompareFunction<T>;
  private equals: IEqualsFunction<T>;

  /**
   * Constructs a new Heap.
   * @param  {ICompareFunction<T>} compareFunction a function that compares two
   *                                               nodes of the heap
   * @param  {IEqualsFunction<T>}  equalsFunction  a function indicating whether
   *                                               two nodes are equal
   */
  constructor (
    compareFunction?: ICompareFunction<T>,
    equalsFunction?: IEqualsFunction<T>
  ) {
    this.compare = compareFunction || defaultCompare;
    this.equals = equalsFunction || defaultEquals;
  }

  /**
   * Returns the index of the given node's left child.
   * @param  {number} nodeIndex the index of the node
   * @return {number}           the index of its left child
   */
  private leftChildIndex(nodeIndex: number): number {
    return (2 * nodeIndex) + 1;
  }

  /**
   * Returns the index of the given node's right child.
   * @param  {number} nodeIndex the index of the node
   * @return {number}           the index of its right child
   */
  private rightChildIndex(nodeIndex: number): number {
    return (2 * nodeIndex) + 2;
  }

  /**
   * Returns the index of the given node's parent.
   * @param  {number} nodeIndex the index of a node
   * @return {number}           the index of its parent
   */
  private parentIndex(nodeIndex: number): number {
    return Math.floor((nodeIndex - 1) / 2);
  }

  /**
   * Returns the index of the smallest child node.
   * @param  {number} leftChild  the left child
   * @param  {number} rightChild the right child
   * @return {number}            the smallest child node index
   */
  private minIndex(leftChild: number, rightChild: number): number {
    if (rightChild >= this.data.length) {
      if (leftChild >= this.data.length) {
        return -1;
      } else {
        return leftChild;
      }
    } else {
      if (this.compare(this.data[leftChild], this.data[rightChild]) <= 0) {
        return leftChild;
      } else {
        return rightChild;
      }
    }
  }

  /**
   * Sifts the given node upwards.
   * @param {number} index the index of a node
   */
  private siftUp(index: number): void {
    let parent = this.parentIndex(index);
    while (index > 0 && this.compare(this.data[parent], this.data[index]) > 0) {
      arrays.swap(this.data, parent, index);
      index = parent;
      parent = this.parentIndex(index);
    }
  }

  /**
   * Sifts the given node downwards.
   * @param {number} nodeIndex the index of a node
   */
  private siftDown(nodeIndex: number): void {
    let min = this.minIndex(this.leftChildIndex(nodeIndex),
      this.rightChildIndex(nodeIndex));
    while (min >= 0 && this.compare(this.data[nodeIndex], this.data[min]) > 0) {
      arrays.swap(this.data, min, nodeIndex);
      nodeIndex = min;
      min = this.minIndex(this.leftChildIndex(nodeIndex),
        this.rightChildIndex(nodeIndex));
    }
  }

  /**
   * Updates the position of a given element in the heap.
   * @param {T} element the element to update
   */
  update(element: T): void {
    this.siftUp(this.data.indexOf(element));
  }

  /**
   * Adds the given element to the heap and sifts it upwards.
   * @param  {T}       element the element to add
   * @return {boolean}         true
   */
  add(element: T): boolean {
    this.data.push(element);
    this.siftUp(this.data.length - 1);
    return true;
  }

  /**
   * Removes and returns the heaps root element.
   * @return {T} the root element
   */
  removeRoot(): T {
    if (this.data.length > 0) {
      let obj = this.data[0];
      this.data[0] = this.data[this.data.length - 1];
      this.data.splice(this.data.length - 1, 1);
      if (this.data.length > 0) {
        this.siftDown(0);
      }

      return obj;
    }
    return undefined;
  }

  /**
   * Indicates whether the given element is in the heap.
   * @param  {T}       element the element
   * @return {boolean}         true if the element is in the heap, false
   *                           otherwise
   */
  contains(element: T): boolean {
    return arrays.contains(this.data, element, this.equals);
  }

  /**
   * Indicates whether the heap is empty.
   * @return {boolean} true if the heap is empty, false otherwise
   */
  isEmpty(): boolean {
    return this.data.length <= 0;
  }
}
