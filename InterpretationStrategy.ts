///<reference path="Interpreter.ts"/>
///<reference path="Arrays.ts"/>

import DNFFormula = Interpreter.DNFFormula;
import Conjunction = Interpreter.Conjunction;

/**
 * Represents an interpretation strategy.
 */
interface InterpretationStrategy {
  getInterpretation(
    objects: string[],
    targets: string[],
    action: string,
    physicalLaws: (objectId: string, targetId: string) => boolean
  ): DNFFormula;
}

/**
 * Represents a strategy for a command "take".
 */
class TakeStrategy implements InterpretationStrategy {
  getInterpretation(
    objects: string[],
    targets: string[],
    action: string,
    physicalLaws: (objectId: string, targetId: string) => boolean
  ): DNFFormula {
    let interpretation: DNFFormula = [];

    for (let object of objects)
      interpretation.push([{polarity: true, relation: 'holding',
        args: [object]}]);

    return interpretation;
  }
}

/**
 * Represents a strategy for a "put" command with the quantifier "any" or "the"
 * for the entity to move and a quantifier "the" or "any" for the location.
 */
class PutOneToOneStrategy implements InterpretationStrategy {
  getInterpretation(
    objects: string[],
    targets: string[],
    action: string,
    physicalLaws: (objectId: string, targetId: string) => boolean
  ): DNFFormula {
    let interpretation: DNFFormula = [];

    for (let object of objects)
      for (let target of targets)
        if (physicalLaws(object, target))
          interpretation.push([{polarity: true, relation: action,
              args: [object, target]}]);

    return interpretation;
  }
}

/**
 * Represents a strategy for a "put" command with the quantifier "all" for the
 * entities to move and a quantifier "any" for the location.
 */
class PutAllToAnyStrategy implements InterpretationStrategy {
  getInterpretation(
    objects: string[],
    targets: string[],
    action: string,
    physicalLaws: (objectId: string, targetId: string) => boolean
  ): DNFFormula {
    let interpretation: DNFFormula = [];
    let currentTargets: number[] = [];
    let exitWhile: boolean = false;

    for (let i = 0; i < objects.length; i++)
      currentTargets.push(0);

    while (true) {
      let currentConjunction: Conjunction = [];

      for (let i = 0; i < objects.length; i++)
        if (physicalLaws(objects[i], targets[currentTargets[i]]))
          currentConjunction.push({polarity: true, relation: action,
              args: [objects[i], targets[currentTargets[i]]]});

      if (exitWhile)
        break;

      if (allValues(currentTargets, (e) => e == targets.length - 1))
        exitWhile = true;

      for (let j = currentTargets.length - 1; j >= 0; j--)
        if (currentTargets[j] != targets.length - 1) {
          currentTargets[j]++;
          break;
        } else {
          currentTargets[j] = 0;
        }

      if (currentConjunction.length > 0)
        interpretation.push(currentConjunction);
    }

    if (anyValue(interpretation, (e) => e.length > 1))
      removeAllValues(interpretation, (e) => e.length == 1);

    return interpretation;
  }
}

/**
 * Represents a strategy for a "put" command with the quantifier "any" for the
 * entity to move and a quantifier "all" for the locations.
 */
class PutAnyToAllStrategy implements InterpretationStrategy {
  getInterpretation(
    objects: string[],
    targets: string[],
    action: string,
    physicalLaws: (objectId: string, targetId: string) => boolean
  ): DNFFormula {
    let interpretation: DNFFormula = [];

    for (let object of objects) {
      let currentConjunction: Conjunction = [];

      for (let target of targets) {
        if (physicalLaws(object, target))
          currentConjunction.push({polarity: true, relation: action,
              args: [object, target]});
      }

      if (currentConjunction.length == targets.length)
        interpretation.push(currentConjunction);
    }

    return interpretation;
  }
}

/**
 * Represents a strategy for a "put" command with the quantifier "all" for the
 * entities to move and a quantifier "all" for the locations.
 */
class PutAllToAllStrategy implements InterpretationStrategy {
  getInterpretation(
    objects: string[],
    targets: string[],
    action: string,
    physicalLaws: (objectId: string, targetId: string) => boolean
  ): DNFFormula {
    let interpretation: DNFFormula = [];
    let conjunction: Conjunction = [];

    for (let object of objects)
      for (let target of targets)
        if (physicalLaws(object, target))
          conjunction.push({polarity: true, relation: action,
              args: [object, target]});

    interpretation.push(conjunction);

    return interpretation;
  }
}

/**
 * Returns the right InterpretationStrategy from a given command.
 * @param  {Command}                cmd the command
 * @return {InterpretationStrategy}     the strategy
 */
function getInterpretationStrategy(cmd: Command): InterpretationStrategy {
  if (cmd.location == null) {
    return new TakeStrategy();
  } else {
    let entityQuantifier: string = cmd.entity.quantifier;
    let locationQuantifier: string = cmd.location.entity.quantifier;
    let relation: string = cmd.location.relation;

    if (entityQuantifier == 'all'
        && (locationQuantifier == 'the' || locationQuantifier == 'any')) {
      return new PutAllToAnyStrategy();
    } else if ((entityQuantifier == 'any' || entityQuantifier == 'the')
        && (locationQuantifier == 'the' || locationQuantifier == 'any')) {
      return new PutOneToOneStrategy();
    } else if (entityQuantifier == 'all' && locationQuantifier == 'all') {
      return new PutAllToAllStrategy();
    } else if (entityQuantifier == 'any' && locationQuantifier == 'all') {
      if (relation == 'leftof' || relation == 'rightof' || relation == 'inside')
        return new PutAllToAnyStrategy();
      return new PutAnyToAllStrategy();
    }

    throw Error("ERROR: No valid interpretation: " + cmd);
  }
}
