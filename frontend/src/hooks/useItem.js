import { useEffect, useState } from "react"

/**
 * A hook that wraps any functions created with `createWithItem`
 * and ensures that the function is called inside the `useEffect` hook.
 * @param {(any, any, any, any) => any} withItem a function created by `createWithItem`
 * @param {object} itemsByID `itemsByID` argument of `withItem`
 * @param {any} id `id` argument of `withItem`
 * @param {(any) => any} fn `fn` argument of `withItem`
 * @param {any} defaultValue `defaultValue` argument of `withItem`
 * @returns the value returned by calling `withItem`
 */
export const useItem = (withItem, itemsByID, id, fn, defaultValue = null) => {
    const [value, setValue] = useState(defaultValue)

    useEffect(() => {
        setValue(withItem(itemsByID, id, fn, defaultValue))
    }, [itemsByID, id])

    return value
}

export default useItem