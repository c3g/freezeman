import { listProcesses, listPropertyValues } from "../experimentRuns/actions";

export const listProcessProperties = (id) => async (dispatch, getState) => {
    if (getState().propertyValues.isFetching)
        return;

    const { itemsByID: processesByID } = getState().processes    
    const { itemsByID: propertyValuesByID } = getState().propertyValues
    
    return await (
        Promise.resolve()
    ).then(async () => {
        const isLoaded = id in processesByID;
        if (!isLoaded) {
            return await dispatch(listProcesses({ id__in: id }))
        }
    }).then(async () => {
        const process = processesByID[id];
        const childrenProcessesAreLoaded = process?.children_processes?.every(process => process in processesByID)
        
        if (!childrenProcessesAreLoaded) {
            return await dispatch(listProcesses({ id__in: process.children_processes.join() }))
        }
    }).then(async () => {
        const process = processesByID[id];
        const propertiesAreLoaded = process?.children_properties?.every(property => property in propertyValuesByID)
        const childrenPropertiesAreLoaded = process?.children_processes?.every(process => processesByID[process]?.children_properties?.every(property => property in propertyValuesByID))
        const allPropertiesAreLoaded = propertiesAreLoaded && childrenPropertiesAreLoaded

        if (!allPropertiesAreLoaded) {
            const processIDSAsStr = [id].concat(process.children_processes).join()
            return await dispatch(listPropertyValues({ object_id__in: processIDSAsStr, content_type__model: "process" }))
        }
    })
}