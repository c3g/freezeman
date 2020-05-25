import fetch from "cross-fetch";

import {API_BASE_PATH} from "../config";

export const createNetworkActionTypes = name => ({
    REQUEST: `${name}.REQUEST`,
    RECEIVE: `${name}.RECEIVE`,
    ERROR: `${name}.ERROR`,
});

export const networkAction = (types, url, method="GET") =>
        (body, params={}) =>
        (dispatch, getState) => {

    dispatch({type: types.REQUEST, params});

    const accessToken = getState().auth.tokens.access;

    return fetch(`${API_BASE_PATH}${url(params)}`, {
        method,
        headers: {
            "content-type": "application/json",
            "authorization": accessToken ? `Bearer ${accessToken}` : undefined,
        },
        body: body === undefined ? body : JSON.stringify(body),
    })
    .then(attachJSON)
    .then(response => {
        if (response.ok) {
            dispatch({type: types.RECEIVE, data: response.data, params, receivedAt: Date.now()});
            return response.data;
        }

        return Promise.reject(createAPIError(response));
    })
    .catch(error => {
        dispatch({type: types.ERROR, error, params});
    });
};

function createAPIError(response) {
    const error = new Error(response.data.detail);
    error.url = response.url;
    error.status = response.status;
    error.statusText = response.statusText;
    return error;
}

function attachJSON(response) {
    return response.json()
    .then(data => {
        response.data = data;
        return response;
    })
    .catch(err => {
        response.data = {};
        return response;
    })
}

