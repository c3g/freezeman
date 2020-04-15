import fetch from "cross-fetch";

import {API_BASE_PATH} from "../config";

export const createNetworkActionTypes = name => ({
    REQUEST: `${name}.REQUEST`,
    RECEIVE: `${name}.RECEIVE`,
    FINISH: `${name}.FINISH`,
});

export const networkAction = (types, url, method="GET") =>
    (body=undefined) => async (dispatch, getState) => {
        let result = false;

        await dispatch({type: types.REQUEST});

        try {
            // TODO: Auth
            const response = await fetch(`${API_BASE_PATH}${url}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(getState().auth.tokens.access ? {
                        "Authorization": `Bearer ${getState().auth.tokens.access}`
                    } : {})
                },
                body: body === undefined ? body : JSON.stringify(body),
            });

            if (response.ok) {
                await dispatch({type: types.RECEIVE, data: await response.json(), receivedAt: Date.now()});
                result = true;
            } else {
                console.error(response);
            }
        } catch (e) {
            console.error(e);
        }

        await dispatch({type: types.FINISH});

        return result;
    };
