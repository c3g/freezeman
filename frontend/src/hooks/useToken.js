import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { withToken } from "../utils/api";

export const useToken = (initialState, apiFn, args, responseFn, deps = []) => {
    const [state, setState] = useState(initialState)
    const token = useSelector((state) => state.auth.tokens.access)

    useEffect(() => {
        withToken(token, apiFn)(...args).then((response) => {
            setState(responseFn(response))
        })
    }, deps)

    return state
}

export default useToken