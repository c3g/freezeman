/*
 * reduceNestedObjectByKeyValue.js
 */

export const reduceNestedObjectByKeyValue = (obj, key, targetReducedValue) =>
  Object.keys(obj).reduce((acc, val) =>
    (obj[val][key] === targetReducedValue ? acc : {
        ...acc,
        [val]: obj[val]
      }
    ), {});