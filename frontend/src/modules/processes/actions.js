import { listPropertyValues } from "../experimentRuns/actions";
import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("PROCESSES.GET");
export const LIST = createNetworkActionTypes("PROCESSES.LIST");

export const get = id => async (dispatch, getState) => {
    const process = getState().processes.itemsByID[id];
    if (process && process.isFetching)
        return;

    return await dispatch(networkAction(GET, api.processes.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    if (getState().processes.isFetching)
        return;

    return await dispatch(networkAction(LIST,
        api.processes.list(options),
        { meta: { ...options} }
    ));
};

export const listProperties = (id) => async (dispatch, getState) => {
    if (getState().propertyValues.isFetching)
        return;

    const processesByID = getState().processes.itemsByID
    const propertyValuesByID = getState().propertyValues.itemsByID

    if (!(id in processesByID)) {
        await dispatch(get(id))
    }
    const process = processesByID[id];

    if (!process?.children_processes?.every(process => process in processesByID)) {
        await dispatch(list({ id__in: process.children_processes?.join() ?? "" }))
    }

    const propertiesAreLoaded = process?.children_properties?.every(property => property in propertyValuesByID)
    const childrenPropertiesAreLoaded = process?.children_processes?.every(process => processesByID[process]?.children_properties?.every(property => property in propertyValuesByID))
    
    if (!(propertiesAreLoaded && childrenPropertiesAreLoaded)) {
        const processIDSAsStr = [id].concat(process.children_processes ?? []).join()
        await dispatch(listPropertyValues({ object_id__in: processIDSAsStr, content_type__model: "process" }))
    }
}

export default {
    GET,
    LIST,
    get,
    list,
    listProperties,
}