import { createNetworkActionTypes, networkAction } from "../../utils/actions"
import api from "../../utils/api"

const LIST = createNetworkActionTypes('STEPS.LIST')

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.steps.list(params),
        { meta: params }
    ));
};

export default {
	LIST,
	list
}