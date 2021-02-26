/*
 * reducers.js
 */

export function resetTable(state) {
  return { ...state, items: [], page: { limit: 0, offset: 0 } }
}

