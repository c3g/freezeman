/* 
 * This function merge 2 arrays together into a single array with unique values. 
*/
export function mergeArraysIntoSet<T>(array1: T[], array2: T[]): T[] {
  return [...new Set([...array1, ...array2])]
}
