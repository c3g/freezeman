import { useLocation, useNavigate } from "react-router-dom"

export const useHashURL = (defaultValue) => {
    const history = useNavigate()
    const location = useLocation()
    const tab = location.hash.slice(1) || defaultValue

    return [tab, (value) => { history(`#${value}`) }]
}

export default useHashURL