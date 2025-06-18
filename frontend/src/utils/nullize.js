
/**
 * If this function receives an empty string it returns null.
 * Otherwise, the parameter is returned unmodified. The parameter may be a 
 * string, undefined, null, or anything else.
 * @typedef {any} T
 * @param {T} v 
 * @returns {Exclude<T, ''> | null}
 */
export function nullize(v) {
    if (v === '')
      return null
    return v
  }