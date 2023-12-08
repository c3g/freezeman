/* 
 * This function merge 2 arrays together into a single array with unique values. 
*/
export function mergeArraysIntoSet(array1: any[], array2: any[]): any[] {
  const mergerObject = {}
  array1.forEach((key) => mergerObject[key] = undefined)
  array2.forEach((key) => mergerObject[key] = undefined)
  return Object.keys(mergerObject)
}