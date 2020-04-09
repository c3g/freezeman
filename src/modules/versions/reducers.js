export const versions = (
    state = {
        items: [],
        itemsByModel: {},
        itemsByModelAndID: {},
        serverCount: 0,  // For pagination
        isFetching: false,
        didInvalidate: false,
    },
    action
) => {
    switch (action.type) {
        default:
            return state;
    }
};
