import {createSlice} from "@reduxjs/toolkit"
import {indexBy, map, prop} from "rambda"
import api from "../utils/api"

export const slice = createSlice({
  name: 'groups',
  initialState: {
    isFetching: false,
    isLoaded: false,
    items: [],
    itemsByID: {},
    error: undefined,
  },
  reducers: {
    setIsFetching: (state, action) => {
      state.isFetching = action.payload
      state.error = undefined
    },
    setList: (state, action) => {
      state.isFetching = false
      state.isLoaded = true
      state.items = map(prop('id'), action.payload)
      state.itemsByID = indexBy(prop('id'), action.payload)
    },
    setError: (state, action) => {
      state.isFetching = false
      state.error = action.payload
    },
  },
});

export const { setIsFetching, setList, setError } = slice.actions;

// The function below is called a thunk and allows us to perform async logic. It
// can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
// will call the thunk with the `dispatch` function as the first argument. Async
// code can then be executed and other actions can be dispatched
export const list = () => dispatch => {
  dispatch(setIsFetching(true))
  return dispatch(api.groups.list({ limit: 100000 }))
  .then(response => dispatch(setList(response.data.results)))
  .catch(error => dispatch(setError(error)))
}

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead of
// in the slice file. For example: `useSelector((state) => state.counter.value)`
// export const selectUser = state => state.auth.user;

export const reducer = slice.reducer;
export default {
  ...slice.action,
  list,
}
