import { useState } from "react";
import { useSelector } from "react-redux";
import { withToken } from "../utils/api";

/**
 * 
 * @param {any} initialState 
 * @param {(...any) => any} apiFn
 * @returns the current state and a dispatcher that takes args and a function that takes a response of a successful request.
 */
export const useToken = (initialState, apiFn) => {
    const [state, setState] = useState(initialState)
    const token = useSelector((state) => state.auth.tokens.access)

    return [
        state,
        (args, responseFn) => {
            withToken(token, apiFn)(...args).then((response) => {
                setState(responseFn(response))
            })
        }
    ]
}

export default useToken
