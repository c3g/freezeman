import {createNetworkActionTypes, networkAction} from "../../utils/actions";

export const FETCH_CONTAINER_KINDS = createNetworkActionTypes("FETCH_CONTAINER_KINDS");
export const FETCH_CONTAINERS = createNetworkActionTypes("FETCH_CONTAINERS");  // TODO: Pagination

const _fetchContainerKinds = networkAction(FETCH_CONTAINER_KINDS, "/");  // TODO: URL
export const fetchContainerKinds = () => async (dispatch, getState) => {
    if (getState().containerKinds.isFetching) return;
    await dispatch(_fetchContainerKinds());
}

const _fetchContainers = networkAction(FETCH_CONTAINERS, "/");  // TODO: URL
export const fetchContainers = () => async (dispatch, getState) => {
    if (getState().containers.isFetching) return;
    // TODO: Account for pagination
    if (!getState().containers.didInvalidate && getState().containers.items.length > 0) return;
    await dispatch(_fetchContainers());
};
