import {createSlice} from "@reduxjs/toolkit"

export const slice = createSlice({
  name: 'pagination',
  initialState: { pageSize : 20 },
  reducers: {
    setPageSize: (state, action) => {
      state.pageSize = action.payload
    },
  },
});

export const { setPageSize } = slice.actions;
export const reducer = slice.reducer;
