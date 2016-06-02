///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="InterpretationStrategy.ts"/>

import Entity = Parser.Entity;
import ParseResult = Parser.ParseResult;
import Command = Parser.Command;

/**
 * Interpreter module
 *
 * The goal of the Interpreter module is to interpret a sentence written by the
 * user in the context of the current world state. In particular, it must figure
 * out which objects in the world, i.e. which elements in the `objects` field of
 * WorldState, correspond to the ones referred to in the sentence.
 *
 * Moreover, it has to derive what the intended goal state is and return it as a
 * logical formula described in terms of literals, where each literal represents
 * a relation among objects that should hold. For example, assuming a world
 * state where "a" is a ball and "b" is a table, the command "put the ball on
 * the table" can be interpreted as the literal ontop(a,b). More complex goals
 * can be written using conjunctions and disjunctions of these literals.
 *
 * In general, the module can take a list of possible parses and return a list
 * of possible interpretations, but the code to handle this has already been
 * written for you. The only part you need to implement is the core
 * interpretation function, namely `interpretCommand`, which produces a single
 * interpretation for a single command.
 */
module Interpreter {

  ////////////////////////////////////////////////////////////////////////////
  //            Exported functions, classes and interfaces/types            //
  ////////////////////////////////////////////////////////////////////////////

  /**
   * Top-level function for the Interpreter. It calls `interpretCommand` for
   * each possible parse of the command. No need to change this one.
   * @param  {ParseResult[]}          parses       List of parses produced by
   *                                               the Parser.
   * @param  {WorldState}             currentState The current state of the
   *                                               world.
   * @return {InterpretationResult[]}              Augments ParseResult with a
   *                                               list of interpretations.
   *                                               Each interpretation is
   *                                               represented by a list of
   *                                               Literals.
   */
  export function interpret(parses: ParseResult[],
      currentState: WorldState): InterpretationResult[] {
    let errors: Error[] = [];
    let interpretations: InterpretationResult[] = [];
    parses.forEach((parseresult) => {
      try {
        let result: InterpretationResult = <InterpretationResult>parseresult;
        result.interpretation = interpretCommand(result.parse, currentState);
        interpretations.push(result);
      } catch(err) {
        errors.push(err);
      }
    });

    if (interpretations.length) {
      return interpretations;
    } else {
      // only throw the first error found
      throw errors[0];
    }
  }

  export interface InterpretationResult extends Parser.ParseResult {
    interpretation: DNFFormula;
  }

  export type DNFFormula = Conjunction[];
  export type Conjunction = Literal[];

  /**
   * A Literal represents a relation that is intended to
   * hold among some objects.
   */
  export interface Literal {
    /** Whether this literal asserts the relation should hold
     * (true polarity) or not (false polarity). For example, we
     * can specify that "a" should *not* be on top of "b" by the
     * literal {polarity: false, relation: "ontop", args:
     * ["a","b"]}.
     */
    polarity: boolean;

    /** The name of the relation in question. */
    relation: string;

    /** The arguments to the relation. Usually these will be either objects
     * or special strings such as "floor" or "floor-N" (where N is a column) */
    args: string[];
  }

  export function stringify(result: InterpretationResult): string {
    return result.interpretation.map((literals) => {
      return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
      // return literals.map(stringifyLiteral).join(" & ");
    }).join(" | ");
  }

  export function stringifyLiteral(lit: Literal): string {
    return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",")
        + ")";
  }

  ////////////////////////////////////////////////////////////////////////////
  //                           Private functions                            //
  ////////////////////////////////////////////////////////////////////////////

  /**
   * Returns the object at a given position.
   * @param  {WorldState} state the world state
   * @param  {number}     x     the id of a stack
   * @param  {number}     y     the position in the stack
   * @return {string}           the object or 'floor' if y is negative
   */
  function getObject(state: WorldState, x: number, y: number): string {
    return y < 0 ? 'floor' : state.stacks[x][y];
  }

  /**
   * Indicates whether a stack is valid.
   * @param  {WorldState}        state  the world state
   * @param  {number}            x      the id of a stack
   * @param  {Parser.Object}     object an object with which to compare stack objects
   * @return {boolean}                  true if the stack is valid, false otherwise
   */
  function isStackValid(
    state: WorldState,
    x: number,
    object: Parser.Object
  ): boolean {
    if (x >= 0 && x < state.stacks.length)
      for (let y = 0; y < state.stacks[x].length; y++)
        if (isObjectValid(state, x, y, object))
          return true;

    return false;
  }

  /**
   * Indicates whether the object matches.
   * @param  {WorldState}        state          the world state
   * @param  {string}            stateObjectId  the id of the state object
   * @param  {Parser.Object}     object         the object to check
   * @param  {number}            x              the x position
   * @param  {number}            y              the y position
   * @return {boolean}                          true if the stack is valid, false otherwise
   */
  function objectMatchesCommand(
    state: WorldState,
    stateObjectId: string,
    object: Parser.Object,
    x?: number,
    y?: number
  ): boolean {
    // The object in the state
    let stateObject: Parser.Object = state.objects[stateObjectId];

    if (object.color == null && object.form == null
        && object.size == null && object.object)
      return isObjectValid(state, x, y, object.object);

    if (object.size != null && object.size != stateObject.size)
      return false;
    if (object.color != null && object.color != stateObject.color)
      return false;
    if (object.form != null && object.form != 'anyform'
        && object.form != stateObject.form)
      return false;

    return true;
  }

  /**
   * Indicates whether an object is valid.
   * @param  {WorldState}        state    the world state
   * @param  {number}            x        the id of the stack containing the object
   * @param  {number}            y        the position of the object in the stack
   * @param  {Parser.Object}     object   the object to check
   * @return {boolean}                    true if the object is valid, false otherwise
   */
  function isObjectValid(
    state: WorldState,
    x: number,
    y: number,
    object: Parser.Object
  ): boolean {
    let objectId: string = getObject(state, x, y);
    let locationForm: string;

    if (objectId == 'floor')
      return object.form == 'floor'

    if (!objectMatchesCommand(state, objectId, object, x, y))
      return false;

    if (object.location != null)
      switch(object.location.relation) {
        case 'ontop':
          if ((y > 1 && state.objects[state.stacks[x][y - 1]].form == 'box')
              || !isObjectValid(state, x, y - 1, object.location.entity.object))
            return false;
          break;
        case 'inside':
          if ((y > 1 && state.objects[state.stacks[x][y - 1]].form != 'box')
              || !isObjectValid(state, x, y - 1, object.location.entity.object))
            return false;
          break;
        case 'above':
          for (let i = y - 1; i >= 0; i--)
            if (isObjectValid(state, x, i, object.location.entity.object))
              return true;
          return false;
        case 'under':
          for (let i = y + 1; i < state.stacks[x].length; i++)
            if (isObjectValid(state, x, i, object.location.entity.object))
              return true;
          return false;
        case 'beside':
          if (!isStackValid(state, x - 1, object.location.entity.object)
              && !isStackValid(state, x + 1, object.location.entity.object))
            return false;
          break;
        case 'leftof':
          for (let i = x + 1; i < state.stacks.length; i++)
            if (isStackValid(state, i, object.location.entity.object))
              return true;
          return false;
        case 'rightof':
          for (let i = x - 1; i >= 0; i--)
            if (isStackValid(state, i, object.location.entity.object))
              return true;
          return false;
      }

    return true;
  }

  /**
   * Indicates whether an object respects the physical laws.
   * @param  {Command}    cmd      the command
   * @param  {WorldState} state    the world state.
   * @param  {string}     objectId the id of the object
   * @param  {string}     targetId the id of the potential future location of the
   *                               object
   * @return {boolean}             true if the object respects the physical laws,
   *                               false otherwise
   */
  function physicalLaws(
    cmd: Command,
    state: WorldState,
    objectId: string,
    targetId: string
  ): boolean {
    let relation: string = cmd.location.relation;

    if (targetId == 'floor')
      return (relation == 'ontop' || relation == 'above')
          && (cmd.location == null
              || cmd.location.entity.object.form == 'floor');

    if (objectId == targetId)
      return false;

    let object: Parser.Object = state.objects[objectId];
    let target: Parser.Object = state.objects[targetId];

    if (object.form == 'ball' && ((relation == 'inside' && target.form != 'box')
        || (relation == 'ontop' && target.form != 'floor')))
      return false;
    if (target.form == 'ball' && (relation == 'ontop' || relation == 'above'))
      return false;
    if (target.size == 'small' && object.size == 'large'
        && (relation == 'ontop' || relation == 'inside'))
      return false;
    if (target.form == 'box' && target.size == object.size
        && (object.form == 'pyramid' || object.form == 'plank'
            || object.form == 'box')
        && (relation == 'ontop' || relation == 'inside'))
      return false;
    if (object.form == 'box'
        && (target.form == 'brick' || target.form == 'pyramid')
        && target.size == 'small' && object.size == 'small'
        && (relation == 'ontop' || relation == 'above'))
      return false;
    if (object.form == 'box' && object.size == 'large'
        && target.form == 'pyramid' && target.size == 'large'
        && (relation == 'ontop' || relation == 'above'))
      return false;

    return true;
  }

  /**
   * The core interpretation function.
   * The function analyses the cmd in order to figure out what interpretation
   * to return.
   * @param  {Command}    cmd   The actual command. Note that it is *not* a
   *                            string, but rather an object of type `Command`
   *                            (as it has been parsed by the parser).
   * @param  {WorldState} state The current state of the world. Useful to
   *                            look up objects in the world.
   * @return {DNFFormula}       A list of list of Literal, representing a
   *                            formula in disjunctive normal form (disjunction
   *                            of conjunctions). See the dummy interpetation
   *                            returned in the code for an example, which means
   *                            ontop(a,floor) AND holding(b).
   * @throws                    An error when no valid interpretations can be
   *                            found.
   */
  function interpretCommand(cmd: Command, state: WorldState): DNFFormula {
    let relation: string;
    let objects: string[] = [];
    let targets: string[] = [];
    let interpretation: DNFFormula = [];

    // Adds all valid objects to objects list
    for (let x = 0; x < state.stacks.length; x++)
      for (let y = 0; y < state.stacks[x].length; y++)
        if (isObjectValid(state, x, y, cmd.entity.object))
          objects.push(state.stacks[x][y]);

    if (state.holding != null
        && objectMatchesCommand(state, state.holding, cmd.entity.object)
        && typeof cmd.entity.object.location == 'undefined')
      objects.push(state.holding);

    // Gets the relation and adds all valid targets to targets list (if the
    // command has a location)
    if (cmd.location != null) {
      relation = cmd.location.relation;

      if (cmd.location.entity.object.form == 'floor')
        targets.push('floor');

      for (let x = 0; x < state.stacks.length; x++)
        for (let y = 0; y < state.stacks[x].length; y++)
          if (isObjectValid(state, x, y, cmd.location.entity.object))
            targets.push(state.stacks[x][y]);

      if (state.holding != null
          && objectMatchesCommand(state, state.holding,
              cmd.location.entity.object)
          && typeof cmd.location.entity.object.location == 'undefined')
        targets.push(state.holding);
    }

    // Generates the interpretation
    interpretation = getInterpretationStrategy(cmd).getInterpretation(
      objects, targets, relation, (o, t) => physicalLaws(cmd, state, o, t));

    // An error is thrown if no valid interpretation has been found
    if (interpretation.length == 0)
      throw Error("No valid interpretation");

    return interpretation;
  }
}
