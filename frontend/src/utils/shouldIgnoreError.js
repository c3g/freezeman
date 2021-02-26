/*
 * shouldIgnoreError.js
 */


export default function shouldIgnoreError(action) {
  const ignoreError = action?.meta?.ignoreError

  if (ignoreError === true)
    return true

  if (typeof ignoreError === 'string' && ignoreError === action.error.name)
    return true

  if (Array.isArray(ignoreError) && ignoreError.some(e => e === action.error.name))
    return true

  if (typeof ignoreError === 'function' && ignoreError(action.error, action))
    return true

  return false
}

