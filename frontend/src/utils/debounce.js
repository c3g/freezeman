/*
 * debounce.js
 */

import { useEffect, useState } from "react"

export default function useDebounce(delay, fn) {
  const [timeoutValue, setTimeoutValue] = useState(undefined);
  const [savedArgs, setSavedArgs] = useState(null);
  
  useEffect(() => {
    if (savedArgs) {
        setTimeoutValue((timeoutValue) => {
          if (timeoutValue) {
            clearTimeout(timeoutValue)
          }
          return setTimeout(() => {
            fn(...savedArgs)
            clearTimeout(timeoutValue)
            setSavedArgs(null)
          }, delay)
        })
    }

    return () => {
      clearTimeout(timeoutValue)
      setTimeoutValue(undefined)  
      setSavedArgs(null)
    }
  }, [savedArgs])

  return (...args) => {
    setSavedArgs(args)
  }
}
