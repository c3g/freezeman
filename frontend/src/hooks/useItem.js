import { useEffect, useState } from "react"

export const useItem = (withItem, itemsByID, id, fn, defaultValue = null) => {
    const [value, setValue] = useState(defaultValue)

    useEffect(() => {
        setValue(withItem(itemsByID, id, fn, defaultValue))
    }, [itemsByID, id])

    return value
}

export default useItem