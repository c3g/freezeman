export const summaryReducerFactory = moduleActions => (
  state = {
    data: {},
    isFetching: false,
    error: null,
  },
  action
) => {
  switch (action.type) {
    case moduleActions.SUMMARY.REQUEST:
      return {...state, isFetching: true};
    case moduleActions.SUMMARY.RECEIVE:
      return {...state, data: action.data, isFetching: false};
    case moduleActions.SUMMARY.ERROR:
      return {...state, error: action.error, isFetching: false};

    default:
      return state;
  }
};
