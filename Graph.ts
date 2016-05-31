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

  let startTime: number = -Date.now();
  timeout *= 1000;

  // The set of closed nodes.
  let closedStartNodes: Set<Node> = new Set<Node>();
  let closedGoalNodes: Set<Node> = new Set<Node>();
  // The nodes predecessor.
  let predecessors: Dictionary<CostNode<Node>, CostNode<Node>> = new Dictionary<CostNode<Node>, CostNode<Node>>();
  let successors: Dictionary<CostNode<Node>, CostNode<Node>> = new Dictionary<CostNode<Node>, CostNode<Node>>();

  // Comparison of 2 Nodes, where they are never the same.
  let compareFValue: ICompareFunction<CostNode<Node>> = function(first, second) {
    let difference = first.fCost - second.fCost;
    if (difference != 0) {
      return difference;
    } else {
      return 1;
    }
  }

  let costNodesEqual = function(first : CostNode<Node> , second : CostNode<Node>) : boolean {
    if(graph.compareNodes(first.node,second.node) == 0) {
      return true;
    }
    return false;
  }

  //recursion to get all goal nodes
  function getGoalNodes(usedNodes: Set<Node>, actual: Node, goalNodes: Set<Node>) : Set<Node> {
    for (let edge of graph.outgoingEdges(actual)) {
      if (!usedNodes.contains(edge.to)) {
        if(goal(edge.to))
        {
          goalNodes.add(edge.to);
        }
        usedNodes.add(edge.to);
        goalNodes.union(getGoalNodes(usedNodes, edge.to, goalNodes));
      }
    }
    return goalNodes;
  }

  // The set of open nodes.
  let openNodesStart:  Heap<CostNode<Node>> =
    new Heap<CostNode<Node>>(compareFValue, costNodesEqual);
  let openNodesGoal:  Heap<CostNode<Node>> =
      new Heap<CostNode<Node>>(compareFValue, costNodesEqual);
  // Add start to the set of open nodes, including setting its g-cost and predecessor.
  var startNode : CostNode<Node> = new CostNode<Node>(start, 0, 0);
  predecessors.setValue(startNode, startNode);
  openNodesStart.add(startNode);


  //let goalNodes: Set<Node> = new Set<Node>();

  let goalNodes: Set<Node> = getGoalNodes(new Set<Node>(), start, new Set<Node>());
  //let goalNode : CostNode<Node> = new CostNode<Node>(goalNodes.remove(), 0, 0);

  var goalNode: CostNode<Node>;
  goalNodes.forEach((goal) => {
    goalNode = new CostNode<Node>(goal,0,0);
    openNodesGoal.add(goalNode);
    successors.setValue(goalNode, goalNode);
  });

  // search algorithm
  while (!openNodesStart.isEmpty() && !openNodesGoal.isEmpty()) {
    if (!((startTime + Date.now()) < timeout)) {
      // Throws an exception in case of timed out
      throw Error("Search Timed Out");
    }

    //from start to goal
    let currentStartNode : CostNode<Node> = openNodesStart.removeRoot();
    closedStartNodes.add(currentStartNode.node);

    let currentGoalNode : CostNode<Node> = openNodesGoal.removeRoot();
    closedGoalNodes.add(currentGoalNode.node);


    // Optimal path found.
    if (goal(currentStartNode.node) || closedGoalNodes.contains(currentStartNode.node)) {

      let path: LinkedList<Node> = new LinkedList<Node>();
      let path2: LinkedList<Node> = new LinkedList<Node>();
      // Collects path nodes
      if(closedStartNodes.contains(successors.getValue(currentStartNode).node) &&
        closedStartNodes.contains(predecessors.getValue(currentStartNode).node)) {
        console.log("ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!");

        currentStartNode = predecessors.getValue(currentStartNode);
      }
      result.cost = currentStartNode.getGCost();
      currentGoalNode = successors.getValue(currentStartNode);
      console.log(currentStartNode.node);
      console.log(currentGoalNode.node);
      while (!path.contains(start)) {
        path.add(currentStartNode.node);
        currentStartNode = predecessors.getValue(currentStartNode);
      }
      do {
        path2.add(currentGoalNode.node);
        currentGoalNode = successors.getValue(currentGoalNode);
        result.cost++;
      }while(!goal(currentGoalNode.node))
      path2.add(currentGoalNode.node);
      result.cost++;
      result.path = path.toArray().reverse().concat(path2.toArray());

      break;
    }

    // Goes through every neighbouring node.
    for (let edge of graph.outgoingEdges(currentStartNode.node)) {
      if (!closedStartNodes.contains(edge.to)) {
        var node : CostNode<Node> = openNodesStart.getElement(new CostNode<Node>(edge.to,0,0));
        if(node == null) {
          node = new CostNode<Node>(edge.to, currentStartNode.getGCost() + edge.cost, heuristics(edge.to));
          predecessors.setValue(node, currentStartNode);
          openNodesStart.add(node);
        } else if(currentStartNode.getGCost() + edge.cost < node.getGCost()) {
          predecessors.setValue(node, currentStartNode);
          node.setGCost(currentStartNode.getGCost() + edge.cost);
          openNodesStart.update(node);
        }
      }
    }


    // search for start, starting from the goal nodes
    if(closedStartNodes.contains(currentGoalNode.node) && false) {
      result.cost = currentStartNode.getGCost();// + currentGoalNode.getGCost();
      let path: LinkedList<Node> = new LinkedList<Node>();
      let path2: LinkedList<Node> = new LinkedList<Node>();
      // Collects path nodes
      //console.log(currentStartNode.node);

      currentGoalNode = successors.getValue(currentStartNode);
      while (!path.contains(start)) {
        path.add(currentStartNode.node);
        currentStartNode = predecessors.getValue(currentStartNode);
      }
      do {
        path2.add(currentGoalNode.node);
        currentGoalNode = successors.getValue(currentGoalNode);
        result.cost++;
      }while(!goal(currentGoalNode.node))
      path2.add(currentGoalNode.node);
      result.cost++;
      result.path = path.toArray().reverse().concat(path2.toArray());
      break;
    }

    // Goes through every incoming node.
    for (let edge of graph.outgoingEdges(currentGoalNode.node)) {
      if (!closedGoalNodes.contains(edge.to)) {
        var node2 : CostNode<Node> = openNodesGoal.getElement(new CostNode<Node>(edge.to,0,0));
        if(node2 == null) {
          node2 = new CostNode<Node>(edge.to, currentGoalNode.getGCost() + edge.cost, heuristics(edge.to));
          successors.setValue(node2, currentGoalNode);
          openNodesGoal.add(node2);
        } else if(currentGoalNode.getGCost() + edge.cost < node2.getGCost()) {
          successors.setValue(node2, currentGoalNode);
          node2.setGCost(currentGoalNode.getGCost() + edge.cost);
          openNodesGoal.update(node2);
        }
      }
    }
  }
  return result;
}


class CostNode<Node> {
  node : Node;
  private gCost : number;
  private hCost : number;
  fCost : number;

  constructor(node : Node, gCost : number, hCost : number) {
    this.node = node;
    this.hCost = hCost;
    this.setGCost(gCost);
  }

  setGCost(gCost : number) {
    this.gCost = gCost;
    this.fCost = gCost + this.hCost;
  }
  getGCost() : number {
    return this.gCost;
  }

  toString() : string {
    return "" + this.node;
  }
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
  // The nodes predecessor.
  let predecessors: Dictionary<CostNode<Node>, CostNode<Node>> = new Dictionary<CostNode<Node>, CostNode<Node>>();

  // Comparison of 2 Nodes, where they are never the same.
  let compareFValue: ICompareFunction<CostNode<Node>> = function(first, second) {
    let difference = first.fCost - second.fCost;
    if (difference != 0) {
      return difference;
    } else {
      return 1;
    }
  }

  let costNodesEqual = function(first : CostNode<Node> , second : CostNode<Node>) : boolean {
    if(graph.compareNodes(first.node,second.node) == 0) {
      return true;
    }
    return false;
  }

  // The set of open nodes.
  let openNodes: Heap<CostNode<Node>> =
    new Heap<CostNode<Node>>(compareFValue, costNodesEqual);

  // Add start to the set of open nodes, including setting its g-cost and predecessor.
  var startNode : CostNode<Node> = new CostNode<Node>(start, 0, 0);
  predecessors.setValue(startNode, startNode);
  openNodes.add(startNode);

  // Continues looking through the set of open nodes as long as theres any left.
  while (!openNodes.isEmpty()) {
    if (!((startTime + Date.now()) < timeout)) {
      // Throws an exception in case of timed out
      throw Error("Search Timed Out");
    }

    let currentNode : CostNode<Node> = openNodes.removeRoot();
    closedNodes.add(currentNode.node);

    // Optimal path found.
    if (goal(currentNode.node)) {
      result.cost = currentNode.getGCost();
      let path: LinkedList<Node> = new LinkedList<Node>();
      // Collects path nodes
      while (!path.contains(start)) {
        path.add(currentNode.node);
        currentNode = predecessors.getValue(currentNode);
      }
      // Sets result path.
      result.path = path.toArray().reverse();
      break;
    }

    // Goes through every neighbouring node.
    for (let edge of graph.outgoingEdges(currentNode.node)) {
      // console.log(currentNode);
      // console.log(edge.to);
      // console.log(graph.compareNodes(currentNode, edge.to));
      // if (costs.containsKey(edge.to)) {
      //   console.log(costs.containsKey(edge.to));
      // } else {
      //   console.log(costs.getValue(currentNode) + edge.cost);
      //   console.log(costs.getValue(edge.to));
      // }
      // console.log("edge.to: ");
      // console.log(edge.to);
      // console.log("closedNodes.contains(edge.to): " + closedNodes.contains(edge.to));
      // console.log("closedNodes: ");
      // closedNodes.forEach(node => {
      //   console.log(node);
      // });
      if (!closedNodes.contains(edge.to)) {
        // console.log("test!");
        // Found the currently most optimal path to the neighbour.
        var node : CostNode<Node> = openNodes.getElement(new CostNode<Node>(edge.to,0,0));
        if(node == null) {
          node = new CostNode<Node>(edge.to, currentNode.getGCost() + edge.cost, heuristics(edge.to));
          predecessors.setValue(node, currentNode);
          openNodes.add(node);
        } else if(currentNode.getGCost() + edge.cost < node.getGCost()) {
          predecessors.setValue(node, currentNode);
          node.setGCost(currentNode.getGCost() + edge.cost);
          openNodes.update(node);
        }
/*        if (!costs.containsKey(edge.to) || costs.getValue(currentNode)
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
        }*/
      }
    }
  }

  return result;
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
  getElement(element: T): T {
    for(var e of this.data) {
      if(this.equals(element,e)) {
        return e;
      }
    }
    return null;
  }

  /**
   * Indicates whether the heap is empty.
   * @return {boolean} true if the heap is empty, false otherwise
   */
  isEmpty(): boolean {
    return this.data.length <= 0;
  }
}
