///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="Arrays.ts"/>

import Literal = Interpreter.Literal;

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

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter.
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
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

    //////////////////////////////////////////////////////////////////////
    // private functions

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

    function getPosition(objectId: string, state: WorldState): number[] {
      for (let x = 0; x < state.stacks.length; x++) {
        let y: number = state.stacks[x].indexOf(objectId)

        if (y > -1)
          return [x, y];
      }

      throw Error("ERROR: Object '" + objectId + "' does not exist.");
    }

    function distanceFromArm(objectId: string, state: WorldState): number {
      return Math.abs(getPosition(objectId, state)[0] - state.arm);
    }

    function objectsAbove(objectId: string, state: WorldState): number {
      let position: number[] = getPosition(objectId, state);

      return state.stacks[position[0]].length - position[1] - 1;
    }

    // TODO Refactoring
    function estimatedCostLiteral(literal: Literal, state: WorldState): number {
      if (literalHolds(literal, state))
        return 0;

      switch (literal.relation) {
        case 'holding':
          return (state.holding.length == 0 ? 1 : 2)
              + distanceFromArm(literal.args[0], state);
        case 'ontop':
          return (state.holding.length == 0 ? 1 : 2)
              + (objectsAbove(literal.args[0], state) * 3)
              + distanceFromArm(literal.args[0], state)
              + (objectsAbove(literal.args[1], state) * 3)
              + distanceFromArm(literal.args[1], state);
        case 'inside':
          return (state.holding.length == 0 ? 1 : 2)
              + (objectsAbove(literal.args[0], state) * 3)
              + distanceFromArm(literal.args[0], state)
              + (objectsAbove(literal.args[1], state) * 3)
              + distanceFromArm(literal.args[1], state);
        case 'above':
          return (state.holding.length == 0 ? 1 : 2)
              + (objectsAbove(literal.args[0], state) * 3)
              + distanceFromArm(literal.args[0], state)
              + distanceFromArm(literal.args[1], state);
        case 'under':
          return (state.holding.length == 0 ? 6 : 8)
              + (objectsAbove(literal.args[0], state) * 3)
              + distanceFromArm(literal.args[0], state)
              + (objectsAbove(literal.args[1], state) * 3)
              + distanceFromArm(literal.args[1], state);
        case 'beside':
          return (state.holding.length == 0 ? 1 : 2)
              + (objectsAbove(literal.args[0], state) * 3)
              + (distanceFromArm(literal.args[0], state))
              + (distanceFromArm(literal.args[1], state) - 1);
        case 'leftof':
          return (state.holding.length == 0 ? 1 : 2)
              + (objectsAbove(literal.args[0], state) * 3)
              + distanceFromArm(literal.args[0], state)
              + Math.abs(
                  getPosition(literal.args[1], state)[0] + 1 - state.arm);
        case 'rightof':
          return (state.holding.length == 0 ? 1 : 2)
              + (objectsAbove(literal.args[0], state) * 3)
              + distanceFromArm(literal.args[0], state)
              + Math.abs(
                  getPosition(literal.args[1], state)[0] - 1 - state.arm);
      }

      return 0;
    }

    class StateNode {
      constructor (move: string, state: WorldState) { }

      move: string;
      state: WorldState;

      isGoal(interpretation: DNFFormula): boolean {
        return anyValue(interpretation, conjunction =>
            allValues(conjunction, literal =>
                literalHolds(literal, this.state)));
      }

      heuristics(interpretation: DNFFormula): number {
        return Math.min.apply(null, interpretation.map(conjunction =>
            Math.max.apply(null, conjunction.map(literal =>
                estimatedCostLiteral(literal, this.state)))));
      }
    }

    class StateGraph implements Graph<StateNode> {
      // TODO Return all possible moves (on the fly)
      // Niklas
      outgoingEdges(node: StateNode): Edge<StateNode>[] {
        return null;
      }

      compareNodes: ICompareFunction<StateNode> = function (first, second) {
        // Unneeded
        return 0;
      }
    }

    /**
     * The core planner function. The code here is just a template;
     * you should rewrite this function entirely. In this template,
     * the code produces a dummy plan which is not connected to the
     * argument `interpretation`, but your version of the function
     * should be such that the resulting plan depends on
     * `interpretation`.
     *
     *
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
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

      return result.path.map(node => node.move);
    }

    function getPossibleMoves(state: WorldState): string[] {
      let possibleMoves: string[] = [];

      if (state.holding.length == 0) {
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

    // Dominik
    function canDrop(state: WorldState): boolean {
      return false;
    }

    // Dominik
    function newWorldState(state: WorldState, move: string): WorldState {
      return null;
    }
}
