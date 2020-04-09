export const containers = (
    state = {
        items: [],
        itemsByBarcode: {},
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
