///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

import ICompareFunction = collections.ICompareFunction;
import Heap = collections.Heap;
import Set = collections.Set;
import Dictionary = collections.Dictionary;
import LinkedList = collections.LinkedList;

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
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
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
  goal : (n:Node) => boolean,
  heuristics : (n:Node) => number,
  timeout : number
) : SearchResult<Node> {
  // A dummy search result: it just picks the first possible neighbour
  var result : SearchResult<Node> = {
      path: [start],
      cost: 0
  };

  var openNodes : Heap<Node> = new Heap<Node>(compareNodes);
  var closedNodes : Set<Node> = new Set<Node>();
  var costs : Dictionary<Node, number> = new Dictionary<Node, number>();
  var predecessors : Dictionary<Node, Node> = new Dictionary<Node, Node>();
  openNodes.add(start);

  var getF = function(node : Node) : number{
      return heuristics(node) + costs.getValue(node);
  }

  var compareNodes : ICompareFunction<Node> = function(first, second) {
      return getF(firstNode) - getF(secondNode);
  }

  while (openNodes.size() > 0) {
    var currentN = openNodes.removeRoot();
    console.log("one node removed");
    if(goal(currentN)) {
      var path : LinkedList<Node> = new LinkedList<Node>();
      while(!path.contains(start)) { //collect path nodes
        path.add(currentN);
        currentN = predecessors.getValue(currentN);
      }

      // reverse to create path
      result.path = path.toArray().reverse();

      result.cost = costs.getValue(currentN);
      console.log(result);

      break;
    }

    for (var edge of graph.outgoingEdges(currentN)) {
      if(!closedNodes.contains(edge.to)) {
        //openNodes.add(edge.to);
        if(!openNodes.contains(edge.to)
          || costs.getValue(currentN) + edge.cost < costs.getValue(edge.to)) {
          predecessors.setValue(edge.to, currentN);
          costs.setValue(edge.to, costs.getValue(currentN) + edge.cost);
          if(!openNodes.contains(edge.to)) {
            openNodes.add(edge.to);
            console.log("one node added");
          }
          else {
            //shift / bubble up
          }
        }
      }
    }
    closedNodes.add(currentN);

  /*
  while the open list is not empty
    find the node with the least f on the open list, call it "q"
    pop q off the open list
    generate q's 8 successors and set their parents to q
    for each successor
    	if successor is the goal, stop the search
        successor.g = q.g + distance between successor and q
        successor.h = distance from goal to successor------------
        successor.f = successor.g + successor.h-------------

        if a node with the same position as successor is in the OPEN list \
            which has a lower f than successor, skip this successor
        if a node with the same position as successor is in the CLOSED list \
            which has a lower f than successor, skip this successor
        otherwise, add the node to the open list
    end
    push q on the closed list
  end
  */
  }
  return result;
}
