///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

import Entity = Parser.Entity;
import ParseResult = Parser.ParseResult;
import Command = Parser.Command;

/**
 * Interpreter module
 *
 * The goal of the Interpreter module is to interpret a sentence
 * written by the user in the context of the current world state. In
 * particular, it must figure out which objects in the world,
 * i.e. which elements in the `objects` field of WorldState, correspond
 * to the ones referred to in the sentence.
 *
 * Moreover, it has to derive what the intended goal state is and
 * return it as a logical formula described in terms of literals, where
 * each literal represents a relation among objects that should
 * hold. For example, assuming a world state where "a" is a ball and
 * "b" is a table, the command "put the ball on the table" can be
 * interpreted as the literal ontop(a,b). More complex goals can be
 * written using conjunctions and disjunctions of these literals.
 *
 * In general, the module can take a list of possible parses and return
 * a list of possible interpretations, but the code to handle this has
 * already been written for you. The only part you need to implement is
 * the core interpretation function, namely `interpretCommand`, which produces a
 * single interpretation for a single command.
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
  export function interpret(parses : ParseResult[],
      currentState : WorldState) : InterpretationResult[] {
    var errors : Error[] = [];
    var interpretations : InterpretationResult[] = [];
    parses.forEach((parseresult) => {
      try {
        var result : InterpretationResult = <InterpretationResult>parseresult;
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
    interpretation : DNFFormula;
  }

  export type DNFFormula = Conjunction[];
  type Conjunction = Literal[];

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
    polarity : boolean;

    /** The name of the relation in question. */
    relation : string;

    /** The arguments to the relation. Usually these will be either objects
     * or special strings such as "floor" or "floor-N" (where N is a column) */
    args : string[];
  }

  export function stringify(result : InterpretationResult) : string {
    return result.interpretation.map((literals) => {
      return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
      // return literals.map(stringifyLiteral).join(" & ");
    }).join(" | ");
  }

  export function stringifyLiteral(lit : Literal) : string {
    return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",")
        + ")";
  }

  ////////////////////////////////////////////////////////////////////////////
  //                           Private functions                            //
  ////////////////////////////////////////////////////////////////////////////

  /**
   * The core interpretation function. The code here is just a template; you
   * should rewrite this function entirely. In this template, the code produces
   * a dummy interpretation which is not connected to `cmd`, but your version of
   * the function should analyse cmd in order to figure out what interpretation
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
   */
  function interpretCommand(cmd : Command, state : WorldState) : DNFFormula {
    var action : string;
    var objects : string[] = [];
    var targets : string[] = [];
    var interpretation : DNFFormula = [];

    /**
     * Returns the object at the given position.
     * @param  {number} x the id of a stack
     * @param  {number} y the position in the stack
     * @return {string}   the object or 'floor' if y is negative
     */
    var getObject = function (x : number, y : number) : string {
      return y < 0 ? 'floor' : state.stacks[x][y];
    }

    /**
     * Indicates whether a stack is valid.
     * @param  {number} x      the id of a stack
     * @param  {Entity} entity an entity with which to compare stack objects
     * @return {boolean}       true if the stack is valid, false otherwise
     */
    var isStackValid = function (x : number, entity : Entity) : boolean {
      if (x >= 0 && x < state.stacks.length)
        for (var y = 0; y < state.stacks[x].length; y++)
          if (isObjectValid(state.stacks[x][y], x, y, entity))
            return true;

      return false;
    }

    /**
     * Indicates whether an object is valid.
     * @param  {string} objectId the id of the object to compare
     * @param  {number} x        the id of the stack containing the object
     * @param  {number} y        the position of the object in the stack
     * @param  {Entity} entity   the entity containing the other object
     * @return {boolean}         true if the object is valid, false otherwise
     */
    var isObjectValid = function (objectId : string, x : number, y : number,
        entity : Entity) : boolean {
      if (objectId == 'floor')
        return entity.object.form == 'floor'

      var stateObject = state.objects[objectId]; // The object in the state
      var commandObject = entity.object; // The given object

      if (commandObject.color == null && commandObject.form == null
          && commandObject.size == null && commandObject.object)
        commandObject = entity.object.object;

      if (commandObject.size != null && commandObject.size != stateObject.size)
        return false;
      if (commandObject.color != null
          && commandObject.color != stateObject.color)
        return false;
      if (commandObject.form != null && commandObject.form != 'anyform'
          && commandObject.form != stateObject.form)
        return false;
      if (entity.object.location != null)
        switch(entity.object.location.relation) {
          case 'ontop':
            if (!isObjectValid(getObject(x, y - 1), x, y - 1,
                entity.object.location.entity))
              return false;

            break;
          case 'inside':
            if (!isObjectValid(getObject(x, y - 1), x, y - 1,
                entity.object.location.entity))
              return false;

            break;
          case 'above':
            for (var i = y - 1; i >= 0; i--)
              if (isObjectValid(getObject(x, i), x, i,
                  entity.object.location.entity))
                return true;

            return false;
          case 'under':
            for (var i = y + 1; i < state.stacks[x].length; i++)
              if (isObjectValid(getObject(x, i), x, i,
                  entity.object.location.entity))
                return true;

            return false;
          case 'beside':
            if (!isStackValid(x - 1, entity.object.location.entity)
                && !isStackValid(x + 1, entity.object.location.entity))
              return false;
            break;
          case 'leftof':
            for (var i = x + 1; i < state.stacks.length; i++)
              if (isStackValid(i, entity.object.location.entity))
                return true;

            return false;
          case 'rightof':
            for (var i = x - 1; i >= 0; i--)
              if (isStackValid(i, entity.object.location.entity))
                return true;

            return false;
        }

      return true;
    }

    /**
     * Indicates whether an object respects the physical laws.
     * @param  {string}  objectId the id of the object
     * @param  {string}  targetId the id of the potential future location of the
     *                            object
     * @return {boolean}          true if the object respects the physical laws,
     *                            false otherwise
     */
    var physicalLaws = function (objectId : string,
        targetId : string) : boolean {
      if (targetId == 'floor')
        return (action == 'ontop' || action == 'above') && (cmd.location == null
            || cmd.location.entity.object.form == 'floor');

      var object = state.objects[objectId];
      var target = state.objects[targetId];

      if (objectId == targetId)
        return false;
      if (object.form == 'ball' && (action == 'inside' && target.form != 'box')
          || (action == 'ontop' && target.form != 'floor'))
        return false;
      if (target.form == 'ball' && (action == 'ontop' || action == 'above'))
        return false;
      if (target.size == 'small' && object.size == 'large'
          && (action == 'ontop' || action == 'inside'))
        return false;
      if (target.form == 'box' && target.size == object.size
          && (object.form == 'pyramid' || object.form == 'plank'
              || object.form == 'box')
          && (action == 'ontop' || action == 'inside'))
        return false;
      if (object.form == 'box'
          && (target.form == 'brick' || target.form == 'pyramid')
          && target.size == 'small' && object.size == 'small'
          && (action == 'ontop' || action == 'above'))
        return false;
      if (object.form == 'box' && object.size == 'large'
          && target.form == 'pyramid'
          && target.size == 'large' && (action == 'ontop' || action == 'above'))
        return false;

      return true;
    }

    /**
     * Sets the interpretation with a location having a "all" quantifier.
     */
    var locationEntityAll = function () : void {
      var currentTargets : number[] = [];
      var targetMinValue : number = physicalLaws('', targets[0]) ? 0 : 1;

      for (var i = 0; i < objects.length; i++)
        currentTargets.push(targetMinValue);

      while (interpretation.length < Math.pow(targets.length - targetMinValue,
          objects.length)) {
        var currentConjunction : Literal[] = [];

        for (var i = 0; i < objects.length; i++)
          if (physicalLaws(objects[i], targets[currentTargets[i]]))
            currentConjunction.push({polarity: true, relation: action,
                args: [objects[i], targets[currentTargets[i]]]});

        for (var j = currentTargets.length - 1; j >= 0; j--)
          if (currentTargets[j] != targets.length - 1) {
            currentTargets[j]++;
            break;
          } else {
            currentTargets[j] = targetMinValue;
          }

        interpretation.push(currentConjunction);
      }
    }

    // Chooses an action in function of the type of command (move or take)
    switch (cmd.command) {
      case 'move':
        action = cmd.location.relation;
        break;
      case 'take':
        action = 'holding';
        break;
    }

    // Adds all valid objects to objects list
    for (var x = 0; x < state.stacks.length; x++)
      for (var y = 0; y < state.stacks[x].length; y++)
        if (isObjectValid(state.stacks[x][y], x, y, cmd.entity))
          objects.push(state.stacks[x][y]);

    // Adds all valid targets to targets list
    if (cmd.location != null) {
      targets.push('floor');

      for (var x = 0; x < state.stacks.length; x++)
        for (var y = 0; y < state.stacks[x].length; y++)
          if (isObjectValid(state.stacks[x][y], x, y, cmd.location.entity))
            targets.push(state.stacks[x][y]);
    }

    // Generates the interpretation
    if (cmd.entity.quantifier == 'all') {
      interpretation.push([]);
      for (var object of objects)
        if (cmd.location != null) {
          for (var target of targets)
            if (physicalLaws(object, target))
              interpretation[0].push({polarity: true, relation: action,
                  args: [object, target]});
        } else {
          interpretation[0].push({polarity: true, relation: action,
              args: [object]});
        }
    } else if (cmd.location != null
        && cmd.location.entity.quantifier == 'all') {
      locationEntityAll();
    } else {
      for (var object of objects)
        if (cmd.location != null) {
          for (var target of targets)
            if (physicalLaws(object, target))
              interpretation.push([{polarity: true, relation: action,
                  args: [object, target]}]);
        } else {
          interpretation.push([{polarity: true, relation: action,
              args: [object]}]);
        }
    }

    // An error is thrown if no valid interpretation has been found
    if (interpretation.length == 0)
        throw Error("ERROR: No valid interpretation : " + cmd);

    return interpretation;
  }
}
