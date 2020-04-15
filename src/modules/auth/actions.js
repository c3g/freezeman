import jwtDecode from "jwt-decode";

import {createNetworkActionTypes, networkAction} from "../../utils/actions";

export const INVALIDATE_AUTH = "INVALIDATE_AUTH";

export const PERFORM_AUTH = createNetworkActionTypes("PERFORM_AUTH");
export const REFRESH_AUTH_TOKEN = createNetworkActionTypes("REFRESH_AUTH_TOKEN");

export const invalidateAuth = () => ({type: INVALIDATE_AUTH});

const _performAuth = networkAction(PERFORM_AUTH, "/token/", "POST");
export const performAuth = (username, password) => async (dispatch, getState) => {
    if (getState().auth.isFetching) return false;

    // TODO: Check if we have a valid auth state already

    return await dispatch(_performAuth({username, password}));
}

const _refreshAuthToken = networkAction(REFRESH_AUTH_TOKEN, "/token/refresh/", "POST");
export const refreshAuthToken = () => async (dispatch, getState) => {
    if (getState().auth.isFetching) return false;

    // Check token validity
    const tokens = getState().auth.tokens;

    if (!tokens.access || !tokens.refresh) {
        // Missing token, should perform auth instead
        await dispatch(invalidateAuth());
        return false;
    }

    try {
        const access = jwtDecode(tokens.access);
        const refresh = jwtDecode(tokens.refresh);

        const now = Date.now() / 1000;

        if (access.exp < now - 30) {  // 30 second buffer for access token refreshing
            // Access token is still valid for another while, don't refresh yet.
            return false;
        }

        if (refresh.exp >= now) {
            // Cannot renew access token, since refresh token is expired.
            await dispatch(invalidateAuth());
            return false;
        }

        return await dispatch(_refreshAuthToken());
    } catch (e) {
        // Invalid token, should perform auth instead
        console.error(e);
        await dispatch(invalidateAuth());
    }

    return false;
}
