import jwtDecode from "jwt-decode";

import api from "../../utils/api";
import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import { selectAuthState } from "../../selectors"
import { isNullish } from "../../utils/functions"


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

        try {
            await dispatch({
                type: REFRESH_AUTH_TOKEN.REQUEST
            })

            const response = await dispatch(api.auth.tokenRefresh({ refresh: tokens.refresh }))

            // Race condition check.
            // It's possible that the user is logged out asynchronously while we are busy refreshing
            // the token. If this happens, the redux state has been cleared, and we should not stick
            // the token into redux. Otherwise, it creates a confusing state where the current user ID
            // is null but there is an access token in the state, and this caused some confusion in the UX.
            // We will only set the refreshed token if the current user ID is valid.
            //
            // The other option would be to set user ID along with the token, but then we are effectively
            // logging the user back in, which is a bad idea.
            const authState = selectAuthState(getState())
            if (!isNullish(authState.currentUserID)) {
                await dispatch({
                    type: REFRESH_AUTH_TOKEN.RECEIVE,
                    data: response.data
                })
            }
        } catch(error) {
           await dispatch({
            type: REFRESH_AUTH_TOKEN.ERROR,
            error
           })
           await dispatch(logOut())
        }
    } catch (e) {
        // Invalid token, should perform auth instead
        console.error(e);
        await dispatch(logOut());
    }

    return false;
}
