/*
 * debounce.js
 */

export default function debounce(delay, fn) {
  let timeout
  let savedArgs
  return (...args) => {
    savedArgs = args
    if (timeout)
      clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn(...savedArgs)
      timeout = undefined
    }, delay)
  }
}
