

export const createNetworkActionTypes = name => ({
  REQUEST: `${name}.REQUEST`,
  RECEIVE: `${name}.RECEIVE`,
  ERROR: `${name}.ERROR`,
});

export const networkAction = (types, apiAction, { meta: params, transform } = {}) =>
    (dispatch) => {

  dispatch({type: types.REQUEST, params});

  return dispatch(apiAction)
  .then(response => {
    dispatch({
      type: types.RECEIVE,
      data: transform ? transform(response.data) : response.data,
      params,
      receivedAt: Date.now()
    });
    return response.data;
  })
  .catch(error => {
    dispatch({type: types.ERROR, error, params});
  });
};
