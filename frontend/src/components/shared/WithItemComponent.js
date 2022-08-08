import React, { useEffect, useState } from "react"
import { withSample } from "../../utils/withItem"

export const withItemWrapper = (withItem) => (itemsByID, id, fn, defaultValue = null) => {
    const args  = {
        withItem,
        itemsByID,
        id,
        fn,
        defaultValue
    }
    return <WithItemComponent {...args} />
}

export const WithItemComponent = ({withItem, itemsByID, id, fn, defaultValue = null}) => {
    const [value, setValue] = useState(defaultValue)

    useEffect(() => {
        setValue(withItem(itemsByID, id, fn, defaultValue))
    }, [itemsByID, id])

    return <>{value}</>
}

export default WithItemComponent