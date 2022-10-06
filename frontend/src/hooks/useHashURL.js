import { useLocation, useNavigate } from "react-router-dom"
import { useCallback } from "react"

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
 * @param {*} defaultKey 
 * @returns 
 */
export const useHashURL = (defaultKey) => {
    const history = useNavigate()
    const location = useLocation()
    const currentKey = location.hash.slice(1)
    const setCurrentKey = useCallback((key) => { history(`#${key}`) }, [])
    if(!currentKey) {
        setCurrentKey(defaultKey)
    }

    return [currentKey || defaultKey, setCurrentKey]
}

export default useHashURL

