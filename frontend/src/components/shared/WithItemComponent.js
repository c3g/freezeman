import React from "react"
import { useItem } from "../../hooks/useItem"

export const WithItemComponent = (withItem) => (itemsByID, id, fn, defaultValue = null, render = (item) => <>{item}</>) => {
    const Container = ({}) => {
        const item = useItem(withItem, itemsByID, id, fn, defaultValue)
        return render(item)
    }

    return <Container />
}

export default WithItemComponent