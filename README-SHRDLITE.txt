Edited Files :

- Graph.ts
	Includes the implemented A* search function, a node wrapping class for including its costs, and a modified version of the Heap class.

- Interpreter.ts
	Includes the implemented command interpretation function and some private functions that it uses.

- Planner.ts
	Includes the implemented planning function, classes for a graph of nodes representing states, a private function for converting states into actions, and some private functions used for the "The planner describes what it is doing" extension.


Added Files :

- Arrays.ts
	Includes some functions for handling arrays which are used in InterpreterStrategy.ts and Planner.ts.

- InterpretationStrategy.ts
	Includes functions for generating the interpretation which is used in Interpreter.ts and also includes the "Handle all quantifiers" extension.

- TestBiDirectional.ts


Extensions :

- Handle all quantifiers.
  This relies on the strategy pattern (InterpretationStrategy). There are different kind of strategies for the "all" quantifier: PutAnyToAll, PutAllToAll and PutAllToAny. The function getInterpretationStrategy returns the appropriate strategy. 

- The planner describes what it is doing.
	This means that the planner will describe both the object picked/moved and the object that it's putting it on/inside. The planner will describe a object depending on similarities with other objects, starting with describing its form, then adding its color, and finally adding its size.

- BiDirectional Search



Suggested Examples :

Take the yellow box
Put every ball in a large box
