export const auth = (
    state = {
        tokens: {
            access: null,
            refresh: null,
        },
        isFetching: false,
    },
    action
) => {
    switch (action.type) {
        default:
            return state;
    }
};
