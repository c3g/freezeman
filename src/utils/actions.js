import fetch from "cross-fetch";

export const createNetworkActionTypes = name => ({
    REQUEST: `${name}.REQUEST`,
    RECEIVE: `${name}.RECEIVE`,
    FINISH: `${name}.FINISH`,
});

export const networkAction = (types, url, method="GET") =>
    (body=undefined) => async (dispatch, getState) => {
        await dispatch({type: types.REQUEST});

        try {
            // TODO: Auth
            const response = await fetch(url, {
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
            } else {
                console.error(response);
            }
        } catch (e) {
            console.error(e);
        }

        await dispatch({type: types.FINISH});
    };
