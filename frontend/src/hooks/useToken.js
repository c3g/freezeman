import { useState } from "react";
import { useSelector } from "react-redux";
import { withToken } from "../utils/api";

/**
 * 
 * @param {any} initialState 
 * @param {(...any) => any} apiFn 
 * @param {any[]} args 
 * @returns the current state and a dispatcher that takes a function that takes a response of a successful request.
 */
export const useToken = (initialState, apiFn, args) => {
    const [state, setState] = useState(initialState)
    const token = useSelector((state) => state.auth.tokens.access)

    return [
        state,
        (responseFn) => {
            withToken(token, apiFn)(...args).then((response) => {
                setState(responseFn(response))
            })
        }
    ]
}

export default useToken
