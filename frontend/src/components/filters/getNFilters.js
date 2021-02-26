/*
 * getNFilters.js
 */

export default function getNFilters(filters) {
  return Object.values(filters).filter(v => Boolean(v?.value)).length
}
