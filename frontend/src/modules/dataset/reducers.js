import { viewSetRedux, listAndTableRedux } from "../shared/redux";

export const datasets = (state, action) => {
    const reducers = [
        viewSetRedux("datasets", "datasets", "datasets").reducer,
        listAndTableRedux("datasets", "datasets", "datasets", null).reducer
    ];
    return reducers.reduce((s, r) => r(s, action), state);
}
