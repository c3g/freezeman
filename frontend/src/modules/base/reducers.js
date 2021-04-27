import BASE from "./actions";

export const base = (
    state = {
        info: {},
        isFetching: false,
    },
    action
) => {
  switch (action.type) {
    case BASE.INFO.REQUEST:
      return {
        ...state,
        isFetching: true,
      };
    case BASE.INFO.RECEIVE:
      return {
        ...state,
        info: action.data,
        isFetching: false,
      };
    case BASE.INFO.ERROR:
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }

};