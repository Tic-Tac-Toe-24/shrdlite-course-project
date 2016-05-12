///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

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

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

/**
Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
* @param parses List of parses produced by the Parser.
* @param currentState The current state of the world.
* @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
*/
    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
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
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
        var action : string;
        var objects : string[] = [];
        var targets : string[] = [];
        var interpretation : DNFFormula = [];

        var getObject = function (index1 : number, index2 : number) : string {
            if(index2 < 0)
                return 'floor';
            else
                return state.stacks[index1][index2];
        }

        var isStackValid = function (index : number, entity : Parser.Entity) : boolean {
            if(index >= 0 && index < state.stacks.length) {
                for(var index2 = 0; index2 < state.stacks[index].length; index2++) {
                    if(isObjectValid(state.stacks[index][index2],index,index2,entity)) {
                        return true;
                    }
                }
            }
            return false;
        }

        var isObjectValid = function (oid : string, index1 : number, index2 : number, entity : Parser.Entity) : boolean {
            if(oid == 'floor') {
                if(entity.object.form != 'floor')
                    return false;
                
                return true;
            }

            var object = state.objects[oid];
            var eObject = entity.object;

            if(eObject.color == null && eObject.form == null && eObject.size == null && eObject.object) {
                eObject = entity.object.object;
            }

            if (eObject.size != null
                && eObject.size != object.size)
                return false;
            if (eObject.color != null
                && eObject.color != object.color)
                return false;
            if (eObject.form != null
                && eObject.form != 'anyform'
                && eObject.form != object.form) 
                return false;                
            if (entity.object.location != null) {
                switch(entity.object.location.relation) {
                    case 'ontop' :
                        if(!isObjectValid(getObject(index1, index2-1), index1, index2-1, entity.object.location.entity))
                            return false;
                        break;
                    case 'inside' :
                        if(!isObjectValid(getObject(index1, index2-1), index1, index2-1, entity.object.location.entity))
                            return false;
                        break;
                    case 'above' : 
                        
                        break;
                    case 'under' : 
                        
                        break;
                    case 'beside' : 
                        if(!isStackValid(index1-1,entity.object.location.entity) && !isStackValid(index1+1,entity.object.location.entity))
                            return false;
                        break;
                    case 'leftof' : 
                        
                        break;
                    case 'rightof' : 
                        
                        break;
                }
            }
            return true;
        }

        var physicalLaws = function (object : string, target : string) : boolean {
            if(target == 'floor') {
                if(!(action == 'ontop' || action == 'above'))
                    return false;
                if(cmd.location != null && cmd.location.entity.object.form != 'floor')
                    return false;

                return true;
            }

            var obj = state.objects[object];
            var tar = state.objects[target];

            if(object == target)
                return false;
            if(obj.form == 'ball' && (action == 'inside' && tar.form != 'box') || (action == 'ontop' && tar.form != 'floor'))
                return false;
            if(tar.form == 'ball' && (action == 'ontop' || action == 'above'))
                return false;
            if(tar.size == 'small' && obj.size == 'large' && (action == 'ontop' || action == 'inside'))
                return false;
            if(tar.form == 'box' && tar.size == obj.size && (obj.form == 'pyramid' || obj.form == 'plank' || obj.form == 'box') && (action == 'ontop' || action == 'inside'))
                return false;
            if(obj.form == 'box' && (tar.form == 'brick' || tar.form == 'pyramid') && tar.size == 'small' && obj.size == 'small' && (action == 'ontop' || action == 'above'))
                return false;
            if(obj.form == 'box' && obj.size == 'large' && tar.form == 'pyramid' && tar.size == 'large' && (action == 'ontop' || action == 'above'))
                return false;

            return true;
        }

        switch (cmd.command) {
          case 'move':
              action = cmd.location.relation;
              break;
          case 'take':
              action = 'holding';
              break;
          default:
        }

        for (var index1 = 0; index1 < state.stacks.length; index1++)
            for (var index2 = 0; index2 < state.stacks[index1].length; index2++)
                if (isObjectValid(state.stacks[index1][index2], index1, index2, cmd.entity))
                    objects.push(state.stacks[index1][index2]);

        if(cmd.location != null) {
            targets.push('floor');
            for (var index1 = 0; index1 < state.stacks.length; index1++)
                for (var index2 = 0; index2 < state.stacks[index1].length; index2++)
                    if (isObjectValid(state.stacks[index1][index2], index1, index2, cmd.location.entity))
                        targets.push(state.stacks[index1][index2]);
        }

        for (var object of objects)
            if(cmd.location != null) {
                for (var target of targets) {
                    if(physicalLaws(object, target)) {
                        interpretation.push([{polarity: true, relation: action, args: [object, target]}]);
                    }
                }
            } else {
                interpretation.push([{polarity: true, relation: action, args: [object]}]);
            }

        if(interpretation.length == 0)
            throw Error("ERROR: No valid interpretation : " + cmd);
        return interpretation;
    }
}
