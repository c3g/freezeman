import { useState } from "react";
import { useSelector } from "react-redux";
import { withToken } from "../utils/api";

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