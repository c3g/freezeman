import { listPropertyValues } from "../experimentRuns/actions";
import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const LIST = createNetworkActionTypes("PROCESSES.LIST");

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

    const { itemsByID: processesByID } = getState().processes    
    const { itemsByID: propertyValuesByID } = getState().propertyValues

    if (!(id in processesByID)) {
        return await dispatch(list({ id__in: id }))
    }
    const process = processesByID[id];

    if (!process?.children_processes?.every(process => process in processesByID)) {
        return await dispatch(list({ id__in: process.children_processes.join() }))
    }

    const propertiesAreLoaded = process?.children_properties?.every(property => property in propertyValuesByID)
    const childrenPropertiesAreLoaded = process?.children_processes?.every(process => processesByID[process]?.children_properties?.every(property => property in propertyValuesByID))
    
    if (!(propertiesAreLoaded && childrenPropertiesAreLoaded)) {
        const processIDSAsStr = [id].concat(process.children_processes).join()
        return await dispatch(listPropertyValues({ object_id__in: processIDSAsStr, content_type__model: "process" }))
    }
}

export default {
    LIST,
    list,
    listProperties,
}