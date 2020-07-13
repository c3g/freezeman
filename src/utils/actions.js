export const createNetworkActionTypes = name => ({
  REQUEST: `${name}.REQUEST`,
  RECEIVE: `${name}.RECEIVE`,
  ERROR: `${name}.ERROR`,
});

export const networkAction = (types, apiAction, { meta, transform } = {}) => (dispatch) => {
  dispatch({type: types.REQUEST, meta});

  return dispatch(apiAction)
    .then(response => {
      dispatch({
        type: types.RECEIVE,
        data: transform ? transform(response.data) : response.data,
        meta,
      });
      return response.data;
    })
    .catch(error => {
      dispatch({type: types.ERROR, error, meta});
    });
};
