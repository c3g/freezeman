import { useEffect, useMemo } from "react"
import { useHistory } from "react-router-dom"

export const useHashURL = (defaultValue) => {
    const history = useHistory()
    const tab = history.location.hash.slice(1) || defaultValue

    return [tab, (value) => { history.push(`#${value}`) }]
}

export default useHashURL