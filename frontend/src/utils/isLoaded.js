export const isProcessPropertiesLoaded = (processesByID, propertyValuesByID, id) => {
    const isLoaded = id in processesByID;
    const process = processesByID[id] || {};
    const childrenProcessesAreLoaded = process?.children_processes?.every(process => process in processesByID)
    //Process' properties and process' children properties both should be loaded
    const propertiesAreLoaded = process?.children_properties?.every(property => property in propertyValuesByID)
    const childrenPropertiesAreLoaded = process?.children_processes?.
                                          every(process => processesByID[process]?.children_properties?.
                                            every(property => property in propertyValuesByID))
    const allPropertiesAreLoaded = propertiesAreLoaded && childrenPropertiesAreLoaded

    return isLoaded && childrenProcessesAreLoaded && allPropertiesAreLoaded
}