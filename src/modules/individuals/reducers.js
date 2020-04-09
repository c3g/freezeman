export const individuals = (
    state = {
        items: [],
        itemsByParticipantID: {},
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
