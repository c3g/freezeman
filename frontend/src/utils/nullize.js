
/**
 * If this function receives an empty string it returns null.
 * Otherwise, the parameter is returned unmodified. The parameter may be a 
 * string, undefined, null, or anything else.
 * @param {*} v 
 * @returns null for empty strings, the unmodified input parameter otherwise
 */
export function nullize(v) {
    if (v === '')
      return null
    return v
  }