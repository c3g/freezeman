import { useLocation, useNavigate } from "react-router-dom"

/**
 * This hook is used for managing a # hash url with the current location.
 *  Example:
 *      http://localhost/samples/123#overview
 * 
 * where "#overview" is the hashed part of the url.
 * 
 * The hook returns the current key from the current location, or the default
 * key if there is no hash in the current location url.
 * 
 * It returns a function to set a new key and update the location with the given
 * key.
 * 
 * @param {*} defaultValue 
 * @returns 
 */
export const useHashURL = (defaultValue) => {
    const history = useNavigate()
    const location = useLocation()
    const tab = location.hash.slice(1) || defaultValue

    return [tab, (value) => { history(`#${value}`) }]
}

export default useHashURL
