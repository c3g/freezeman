import React, { useEffect, useState } from "react"
import { useItem } from "../../hooks/useItem"

export const WithItemComponent = (withItem) => (itemsByID, id, fn, defaultValue = null, render = (item) => <>{item}</>) => {
    const item = useItem(withItem, itemsByID, id, fn, defaultValue)
    return render(item)
}

export default WithItemComponent