export const createNetworkActionTypes = name => ({
  REQUEST: `${name}.REQUEST`,
  RECEIVE: `${name}.RECEIVE`,
  ERROR: `${name}.ERROR`,
});

/**
 * @param {object} types - Action types for REQUEST, RECEIVE, ERROR
 * @param {function} apiFunction - Store-dispatchable API function
 * @param {object} [options]
 * @param {object} [options.meta] - Additional data for actions
 * @param {boolean} [options.meta.ignoreError] - Don't show error notification on error
 */
export const networkAction = (types, apiAction, options = {}) => (dispatch) => {
  const { meta, transform } = options

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
      return Promise.reject(error)
    });
};
