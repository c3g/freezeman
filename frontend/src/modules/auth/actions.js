import jwtDecode from "jwt-decode";

import api from "../../utils/api";
import { createNetworkActionTypes, networkAction } from "../../utils/actions";


export const LOG_OUT = "AUTH.LOG_OUT";

export const PERFORM_AUTH = createNetworkActionTypes("AUTH.PERFORM");
export const REFRESH_AUTH_TOKEN = createNetworkActionTypes("AUTH.REFRESH_TOKEN");

export const logOut = () => ({ type: LOG_OUT });

const decodeUserID = tokens => ({ tokens, currentUserID: jwtDecode(tokens.access).user_id })

export const performAuth = (username, password) => async (dispatch, getState) => {

    if (getState().auth.isFetching) return false;

    await dispatch(
        networkAction(
            PERFORM_AUTH,
            api.auth.token({ username, password }),
            { transform: decodeUserID }));

}

export const refreshAuthToken = () => async (dispatch, getState) => {
    if (getState().auth.isFetching) return false;

    // Check token validity
    const tokens = getState().auth.tokens;

    if (!tokens.access || !tokens.refresh) {
        // Missing token, should perform auth instead
        await dispatch(logOut());
        return false;
    }

    try {
        const access = jwtDecode(tokens.access);
        const refresh = jwtDecode(tokens.refresh);

        const now = Date.now() / 1000;

        if (access.exp > now + 30) {  // 30 second buffer for access token refreshing
            // Access token is still valid for another while, don't refresh yet.
            return false;
        }

        if (refresh.exp <= now) {
            // Cannot renew access token, since refresh token is expired.
            await dispatch(logOut());
            return false;
        }

        return await dispatch(
            networkAction(
                REFRESH_AUTH_TOKEN,
                api.auth.tokenRefresh({ refresh: tokens.refresh })
            ));
    } catch (e) {
        // Invalid token, should perform auth instead
        console.error(e);
        await dispatch(logOut());
    }

    return false;
}
