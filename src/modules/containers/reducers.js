export const containerKinds = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false
    },
    action
) => {
    switch (action.type) {
        default:
            return state;
    }
}

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
