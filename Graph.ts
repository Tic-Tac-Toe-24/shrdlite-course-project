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
  from : Node;
  to   : Node;
  cost : number;
}

/** A directed graph. */
interface Graph<Node> {
  /** Computes the edges that leave from a node. */
  outgoingEdges(node : Node) : Edge<Node>[];
  /** A function that compares nodes. */
  compareNodes : ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
  /** The path (sequence of Nodes) found by the search algorithm. */
  path : Node[];
  /** The total cost of the path. */
  cost : number;
}

/**
* Calculates the most optimal path from start to goal in the graph, using provided heuristics.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
  graph : Graph<Node>,
  start : Node,
  goal : (n : Node) => boolean,
  heuristics : (n : Node) => number,
  timeout : number
) : SearchResult<Node> {
  var result : SearchResult<Node> = {
    path: [start],
    cost: 0
  };

  var startTime : number = -Date.now();
  timeout *= 1000;

  // The set of closed nodes.
  var closedNodes : Set<Node> = new Set<Node>();
  // The nodes g-costs.
  var costs : Dictionary<Node, number> = new Dictionary<Node, number>();
  // The nodes predecessor.
  var predecessors : Dictionary<Node, Node> = new Dictionary<Node, Node>();

  // Returns the f-value of a Node.
  var getF = function(node : Node) : number{
    return heuristics(node) + costs.getValue(node);
  }

  // Comparison of 2 Nodes, where they are never the same.
  var compareFValue : ICompareFunction<Node> = function(first, second) {
    var difference = getF(first) - getF(second);
    if (difference != 0) {
      return difference;
    } else {
      return 1;
    }
  }

  // The set of open nodes.
  var openNodes : Heap<Node> =
    new Heap<Node>(compareFValue, compareToEquals(graph.compareNodes));

  // Add start to the set of open nodes, including setting its g-cost and predecessor.
  predecessors.setValue(start, start);
  costs.setValue(start, 0);
  openNodes.add(start);

  // Continues looking through the set of open nodes as long as theres any left.
  while (!openNodes.isEmpty() && startTime + Date.now() < timeout) {
    var currentNode = openNodes.removeRoot();
    closedNodes.add(currentNode);

    // Optimal path found.
    if (goal(currentNode)) {
      var path : LinkedList<Node> = new LinkedList<Node>();
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
    for (var edge of graph.outgoingEdges(currentNode)) {
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

// Modified Heap datastructure used to repressent the open set of nodes.
class Heap<T> {
  private data : T[] = [];
  private compare : ICompareFunction<T>;
  private equals : IEqualsFunction<T>;

  // Constructor
  constructor (
    compareFunction? : ICompareFunction<T>,
    equalsFunction? : IEqualsFunction<T>
  ) {
    this.compare = compareFunction || defaultCompare;
    this.equals = equalsFunction || defaultEquals;
  }

  // Index of the nodes left child.
  private leftChildIndex(nodeIndex : number) : number {
    return (2 * nodeIndex) + 1;
  }

  // Index of the nodes right child.
  private rightChildIndex(nodeIndex : number) : number {
    return (2 * nodeIndex) + 2;
  }

  // Index of the nodes parent.
  private parentIndex(nodeIndex : number) : number {
    return Math.floor((nodeIndex - 1) / 2);
  }

  // Index of the smaller child node.
  private minIndex(leftChild : number, rightChild : number) : number {
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

  // Sifts the node upwards.
  private siftUp(index : number) : void {
    var parent = this.parentIndex(index);
    while (index > 0 && this.compare(this.data[parent], this.data[index]) > 0) {
      arrays.swap(this.data, parent, index);
      index = parent;
      parent = this.parentIndex(index);
    }
  }

  // Sifts the node downwards.
  private siftDown(nodeIndex : number) : void {
    var min = this.minIndex(this.leftChildIndex(nodeIndex),
      this.rightChildIndex(nodeIndex));
    while (min >= 0 && this.compare(this.data[nodeIndex], this.data[min]) > 0) {
      arrays.swap(this.data, min, nodeIndex);
      nodeIndex = min;
      min = this.minIndex(this.leftChildIndex(nodeIndex),
        this.rightChildIndex(nodeIndex));
    }
  }

  // Updates the position of a element in the heap.
  update(element : T) : void {
    this.siftUp(this.data.indexOf(element));
  }

  // Adds the element to the heap and sifts it upwards.
  add(element : T) : boolean {
    this.data.push(element);
    this.siftUp(this.data.length - 1);
    return true;
  }

  // Removes and returns the heaps root element.
  removeRoot() : T {
    if (this.data.length > 0) {
      var obj = this.data[0];
      this.data[0] = this.data[this.data.length - 1];
      this.data.splice(this.data.length - 1, 1);
      if (this.data.length > 0) {
        this.siftDown(0);
      }

      return obj;
    }
    return undefined;
  }

  // Returns true if the element is in the heap.
  contains(element : T) : boolean {
    return arrays.contains(this.data, element, this.equals);
  }

  // Returns true if the heap is empty.
  isEmpty() : boolean {
    return this.data.length <= 0;
  }
}
