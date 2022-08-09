import React from "react"
import { useItem } from "../../hooks/useItem"

/**
 * 
 * @param {(any, any, any, any) => any} withItem a function created by `createWithItem`
 * @returns
 * A function that looks like a function created by `createWithItem` but it returns a React component
 * containing the value returned by `withItem`.
 */
export const WithItemComponent = (withItem) => (itemsByID, id, fn, defaultValue = null) => {
    const Container = ({}) => {
        const item = useItem(withItem, itemsByID, id, fn, defaultValue)
        return <>{item}</>
    }

    return <Container />
}

export default WithItemComponent