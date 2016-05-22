///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="Arrays.ts"/>

import Literal = Interpreter.Literal;
import InterpretationResult = Interpreter.InterpretationResult;

/**
 * Planner module
 *
 * The goal of the Planner module is to take the interpetation(s)
 * produced by the Interpreter module and to plan a sequence of actions
 * for the robot to put the world into a state compatible with the
 * user's command, i.e. to achieve what the user wanted.
 *
 * The planner should use your A* search implementation to find a plan.
 */
module Planner {

  ////////////////////////////////////////////////////////////////////////////
  //            Exported functions, classes and interfaces/types            //
  ////////////////////////////////////////////////////////////////////////////

  /**
   * Top-level driver for the Planner. Calls `planInterpretation` for each given
   * interpretation generated by the Interpreter.
   * @param  {InterpretationResult[]} interpretations list of possible
   *                                                  interpretations
   * @param  {WorldState}             currentState    the current state of the
   *                                                  world
   * @return {PlannerResult[]}                        augments
   *         																					InterpretationResult with
   *         																					a plan represented by a
   *         																					list of strings
   */
  export function plan(
    interpretations : InterpretationResult[],
    currentState : WorldState
  ) : PlannerResult[] {
    let errors : Error[] = [];
    let plans : PlannerResult[] = [];
    interpretations.forEach((interpretation) => {
      try {
        let result : PlannerResult = <PlannerResult>interpretation;
        result.plan = planInterpretation(result.interpretation, currentState);
        if (result.plan.length == 0) {
          result.plan.push("That is already true!");
        }
        plans.push(result);
      } catch(err) {
        errors.push(err);
      }
    });
    if (plans.length) {
      return plans;
    } else {
      // only throw the first error found
      throw errors[0];
    }
  }

  export interface PlannerResult extends Interpreter.InterpretationResult {
    plan : string[];
  }

  export function stringify(result : PlannerResult) : string {
    return result.plan.join(", ");
  }

  ////////////////////////////////////////////////////////////////////////////
  //                           Private functions                            //
  ////////////////////////////////////////////////////////////////////////////

  /**
   * Indicates whether a given literal holds in a given world state.
   * @param  {Literal}    literal the literal
   * @param  {WorldState} state   the world state
   * @return {boolean}            true if the literal holds, false otherwise
   */
  function literalHolds(literal: Literal, state: WorldState): boolean {
    switch (literal.relation) {
      case 'holding':
        return state.holding == literal.args[0];
      case 'ontop':
        if (literal.args[1] == 'floor') {
          for (let stack of state.stacks)
            if (stack.indexOf(literal.args[0]) == 0)
              return true;
          return false;
        }

        for (let stack of state.stacks)
          if (stack.indexOf(literal.args[0])
              == stack.indexOf(literal.args[1]) - 1)
            return true;
        return false;
      case 'inside':
        // Same as 'ontop' since it is already checked by the interpreter
        for (let stack of state.stacks)
          if (stack.indexOf(literal.args[0])
              == stack.indexOf(literal.args[1]) - 1)
            return true;
        return false;
      case 'above':
        if (literal.args[1] == 'floor')
          return true;
        for (let stack of state.stacks)
          if (stack.indexOf(literal.args[0]) > stack.indexOf(literal.args[1]))
            return true;
        return false;
      case 'under':
        for (let stack of state.stacks)
          if (stack.indexOf(literal.args[0]) < stack.indexOf(literal.args[1]))
            return true;
        return false;
      case 'beside':
        for (let x = 0; x < state.stacks.length; x++)
          if (state.stacks[x].indexOf(literal.args[0]) > -1)
            return (x >= 1
                    && state.stacks[x - 1].indexOf(literal.args[1]) > -1)
                || (x < state.stacks.length - 1
                    && state.stacks[x + 1].indexOf(literal.args[1]) > -1)
        return false;
      case 'leftof':
        for (let x = 0; x < state.stacks.length; x++)
          if (state.stacks[x].indexOf(literal.args[0]) > -1)
            for (let x2 = x + 1; x2 < state.stacks.length; x2++)
              if (state.stacks[x2].indexOf(literal.args[1]) > -1)
                return true;
        return false;
      case 'rightof':
        for (let x = 0; x < state.stacks.length; x++)
          if (state.stacks[x].indexOf(literal.args[0]) > -1)
            for (let x2 = x - 1; x2 >= 0; x2--)
              if (state.stacks[x2].indexOf(literal.args[1]) > -1)
                return true;
        return false;
    }

    return false;
  }

  /**
   * Returns the position of a given object in a given world state.
   * @param  {string}     objectId the object
   * @param  {WorldState} state    the world state
   * @return {number[]}            a list containing two elements: a stack index
   *                               and a position in a stack
   */
  function getPosition(objectId: string, state: WorldState): number[] {
    for (let x = 0; x < state.stacks.length; x++) {
      let y: number = state.stacks[x].indexOf(objectId)

      if (y > -1)
        return [x, y];
    }

    throw Error("ERROR: Object '" + objectId + "' does not exist.");
  }

  /**
   * Returns the distance of a given object from the arm in the given world
   * state.
   * @param  {string}     objectId the object
   * @param  {WorldState} state    the world state
   * @return {number}              the distance of the object from the arm
   */
  function distanceFromArm(objectId: string, state: WorldState): number {
    return Math.abs(getPosition(objectId, state)[0] - state.arm);
  }

  /**
   * Returns the number of objects above a given object in a given world state.
   * @param  {string}     objectId the object
   * @param  {WorldState} state    the world state
   * @return {number}              the number of objects above the object
   */
  function objectsAbove(objectId: string, state: WorldState): number {
    let position: number[] = getPosition(objectId, state);

    return state.stacks[position[0]].length - position[1] - 1;
  }

  /**
   * Returns the estimate cost of a given literal. The estimate cost is
   * computed using the distance of the object and potentially the target from
   * the arm. The number of objects above the object to move/take might also
   * be used as well as the number of objects above the target.
   * @param  {Literal}    literal the literal
   * @param  {WorldState} state   the world state
   * @return {number}             an estimation of the cost to move/take an
   *                              object
   */
  function estimatedCostLiteral(literal: Literal, state: WorldState): number {
    if (literalHolds(literal, state))
      return 0;

    let holdingCost: number = (state.holding == null) ? 1 : 2

    if (literal.relation == 'holding') {
      return holdingCost
          + distanceFromArm(literal.args[0], state);
    } else {
      if (literal.relation == 'ontop' || literal.relation == 'inside') {
        return holdingCost
            + (objectsAbove(literal.args[0], state) * 3)
            + distanceFromArm(literal.args[0], state)
            + (objectsAbove(literal.args[1], state) * 3)
            + distanceFromArm(literal.args[1], state);
      } else if (literal.relation == 'above') {
        return holdingCost
            + (objectsAbove(literal.args[0], state) * 3)
            + distanceFromArm(literal.args[0], state)
            + distanceFromArm(literal.args[1], state);
      } else if (literal.relation == 'under') {
        return (holdingCost == 1 ? 6 : 8)
            + (objectsAbove(literal.args[0], state) * 3)
            + distanceFromArm(literal.args[0], state)
            + (objectsAbove(literal.args[1], state) * 3)
            + distanceFromArm(literal.args[1], state);
      } else if (literal.relation == 'beside') {
        return holdingCost
            + (objectsAbove(literal.args[0], state) * 3)
            + (distanceFromArm(literal.args[0], state))
            + (distanceFromArm(literal.args[1], state) - 1);
      } else if (literal.relation == 'leftof') {
        return holdingCost
            + (objectsAbove(literal.args[0], state) * 3)
            + distanceFromArm(literal.args[0], state)
            + Math.abs(
                getPosition(literal.args[1], state)[0] + 1 - state.arm);
      } else if (literal.relation == 'rightof') {
        return holdingCost
            + (objectsAbove(literal.args[0], state) * 3)
            + distanceFromArm(literal.args[0], state)
            + Math.abs(
                getPosition(literal.args[1], state)[0] - 1 - state.arm);
      }
    }

    return 0;
  }

  /**
   * Represents a node in a StateGraph. A StateNode has a world state and a move
   * that leads to this state.
   */
  class StateNode {
    /**
     * Constructs a new StateNode.
     * @param  {string}     move  a move
     * @param  {WorldState} state a world state
     */
    constructor (move: string, state: WorldState) {
      this.move = move;
      this.state = state;
    }

    move: string;
    state: WorldState;

    /**
     * Indicates whether the node is a goal node (i.e. the given interpretation
     * holds in its world state).
     * @param  {DNFFormula} interpretation the interpretation
     * @return {boolean}                   true if the node is a goal node,
     *                                     false otherwise
     */
    isGoal(interpretation: DNFFormula): boolean {
      return anyValue(interpretation, conjunction =>
          allValues(conjunction, literal =>
              literalHolds(literal, this.state)));
    }

    /**
     * Returns a heuristic for the node using a given interpretation. In order
     * to compute the heuristic, the function computes all possible heuristics
     * for all possible conjunctions and gets the lowest one (so that it is
     * never greater than the actual cost).
     * @param  {DNFFormula} interpretation the interpretation
     * @return {number}                    the heuristic
     */
    heuristics(interpretation: DNFFormula): number {
      return Math.min.apply(null, interpretation.map(conjunction =>
          Math.max.apply(null, conjunction.map(literal =>
              estimatedCostLiteral(literal, this.state)))));
    }

    // TODO Doc
    compareTo(other: StateNode): number {
      if (JSON.stringify(this) === JSON.stringify(other))
        return 0;
      return 100;
    }

    // TODO Doc
    toString(): string {
      return JSON.stringify(this);
    }
  }

  /**
   * Represents the graph used by the search algorithm. The graph is build on
   * the fly by the search algorithm.
   */
  class StateGraph implements Graph<StateNode> {
    /**
     * Returns the outgoing edges of a given node in the graph.
     * @param  {StateNode}       node the node
     * @return {Edge<StateNode>}      the edges
     */
    outgoingEdges(node: StateNode): Edge<StateNode>[] {
      let edges: Edge<StateNode>[] = [];
      let moves: string[] = getPossibleMoves(node.state);
      let edge: Edge<StateNode>;

      if (moves.indexOf('p') > -1) {
        edge = new Edge<StateNode>();
        edge.cost = 1;
        edge.from = node;
        edge.to = new StateNode('p', newWorldState(node.state, 'p'));
        edges.push(edge);
      }
      if (moves.indexOf('d') > -1) {
        edge = new Edge<StateNode>();
        edge.cost = 1;
        edge.from = node;
        edge.to = new StateNode('d', newWorldState(node.state, 'd'));
        edges.push(edge);
      }
      if (moves.indexOf('l') > -1) {
        edge = new Edge<StateNode>();
        edge.cost = 1;
        edge.from = node;
        edge.to = new StateNode('l', newWorldState(node.state, 'l'));
        edges.push(edge);
      }
      if (moves.indexOf('r') > -1) {
        edge = new Edge<StateNode>();
        edge.cost = 1;
        edge.from = node;
        edge.to = new StateNode('r', newWorldState(node.state, 'r'));
        edges.push(edge);
      }

      return edges;
    }

    // TODO Doc
    compareNodes: ICompareFunction<StateNode> = function (first, second) {
      return first.compareTo(second);
    }
  }

  /**
   * The core planner function. It simply runs runs the A* search algorithm on a
   * StateGraph.
   * @param  {DNFFormula} interpretation the logical interpretation of the
   *                                     user's desired goal. The plan needs to
   *                                     be such that by executing it, the world
   *                                     is put into a state that satisfies this
   *                                     goal.
   * @param  {WorldState} state          the current world state
   * @return {string[]}                  the list of actions the robot should
   *                                     perform
   */
  function planInterpretation(
    interpretation: DNFFormula,
    state: WorldState
  ): string[] {
    let result: SearchResult<StateNode> = aStarSearch(
      new StateGraph(),
      new StateNode('', state),
      node => node.isGoal(interpretation),
      node => node.heuristics(interpretation),
      5
    );

    let actions: string[] = [];

    //result.path.map(node => node.move);

    result.path.forEach(node => {
      if (node.move.length > 0)
        actions.push(node.move);
    });

    console.log(actions);

    return actions;
  }

  /**
   * Returns all the possible moves from a given state.
   * @param  {WorldState} state the world state
   * @return {string[]}         the possible moves
   */
  function getPossibleMoves(state: WorldState): string[] {
    let possibleMoves: string[] = [];

    if (state.holding == null) {
      possibleMoves.push('p');
    } else if (canDrop(state)) {
      possibleMoves.push('d');
    }

    if (state.arm > 0)
      possibleMoves.push('l');

    if (state.arm < state.stacks.length)
      possibleMoves.push('r');

    return possibleMoves;
  }

  /**
   * Indicates whether the arm of a given world state can drop the object it
   * holds.
   * @param  {WorldState} state the world state
   * @return {boolean}          true if the arm can drop the object, false
   *                            otherwise
   */
  function canDrop(state: WorldState): boolean {
    if (JSON.stringify(state).length > 0)
      return false;

    if (state.holding == null)
      return false;

    let objectHeld = state.objects[state.holding];
    let stackUnderArm: string[] = state.stacks[state.arm];
    let objectOnTopOfStack =
        state.objects[stackUnderArm[stackUnderArm.length - 1]];

    // Balls must be in boxes or on the floor, otherwise they roll away.
    if (objectHeld.form == 'ball' && stackUnderArm.length != 0
        && objectOnTopOfStack.form != 'box')
      return false;
    // Balls cannot support anything.
    if (stackUnderArm.length > 0 && objectOnTopOfStack.form == 'ball')
      return false;
    // Small objects cannot support large objects.
    if (objectOnTopOfStack.size == 'small' && objectHeld.size == 'large')
      return false;
    // Boxes cannot contain pyramids, planks or boxes of the same size.
    if (objectOnTopOfStack.form == 'box'
        && objectOnTopOfStack.size == objectHeld.size
        && (objectHeld.form == 'pyramid' || objectHeld.form == 'plank'
            || objectHeld.form == 'box'))
      return false;
    // Small boxes cannot be supported by small bricks or pyramids.
    if (objectHeld.form == 'box' && objectHeld.size == 'small'
        && objectOnTopOfStack.size == 'small'
        && (objectOnTopOfStack.form == 'brick'
            || objectOnTopOfStack.form == 'pyramid'))
      return false;
    // Large boxes cannot be supported by large pyramids.
    if (objectHeld.form == 'box' && objectHeld.size == 'large'
        && objectOnTopOfStack.form == 'pyramid'
        && objectOnTopOfStack.size == 'large')
      return false;

    return true;
  }

  /**
   * Returns a new world state from a given world state on which a given move is
   * applied.
   * @param  {WorldState} state the world state
   * @param  {string}     move  the move
   * @return {WorldState}       the new world state
   */
  function newWorldState(state: WorldState, move: string): WorldState {
    let newStacks: string[][] = [];

    for (let stack of state.stacks) {
      let newStack: string[] = [];

      for (let object of stack)
        newStack.push(object);

      newStacks.push(newStack);
    }

    let newState: WorldState = {
      stacks: newStacks,
      holding: state.holding,
      arm: state.arm,
      objects: state.objects,
      examples: state.examples
    };

    switch (move) {
      case 'l':
        if (newState.arm > 0)
          newState.arm--;
        break;
      case 'r':
        if (newState.arm < newState.stacks.length - 1)
        newState.arm++;
        break;
      case 'd':
        newState.stacks[state.arm].push(newState.holding);
        newState.holding = '';
        break;
      case 'p':
        if (newState.stacks[state.arm].length > 0)
          newState.holding = newState.stacks[state.arm].pop();
        break;
    }

    return newState;
  }
}
