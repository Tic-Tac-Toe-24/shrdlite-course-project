/**
 * Indicates whether all the values of a given array match a given function.
 * @param  {any[]}            array the array
 * @param  {(any) => boolean} match the function
 * @return {boolean}          true if all the values match the given
 *                            function, false otherwise
 */
function allValues(array: any[], match: (value: any) => boolean): boolean {
  for (let element of array)
    if (!match(element))
      return false;

  return true;
}

/**
 * Indicates whether any value of a given array match a given function.
 * @param  {any[]}            array the array
 * @param  {(any) => boolean} match the function
 * @return {boolean}          true if all the values match the given
 *                            function, false otherwise
 */
function anyValue(array: any[], match: (value: any) => boolean): boolean {
  for (let element of array)
    if (match(element))
      return true;

  return false;
}

/**
 * Removes all the values matching a given function in a given array.
 * @param  {any[]}            array the array
 * @param  {(any) => boolean} match the function
 */
function removeAllValues(array: any[], match: (value: any) => boolean): void {
  for (let i = array.length - 1; i >= 0; i--)
    if (match(array[i]))
      array.splice(i, 1);
}

function map(array: any[], transform: (value: any) => any): any[] {
  let newArray: any[] = [];

  for (let element of array)
    newArray.push(transform(element));

  return newArray;
}
