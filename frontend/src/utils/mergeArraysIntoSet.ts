/* 
 * This function merge 2 arrays together into a single array with unique values. 
*/
export function mergeArraysIntoSet(array1: number[], array2: number[]): any[] {
  return [...new Set([...array1, ...array2])]
}