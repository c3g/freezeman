import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FMSId } from "../../models/fms_api_models";

const slice = createSlice({
    name: 'WORKFLOW_ASSIGNMENT',
    initialState: {
        initialExceptedSampleIDs: [] as FMSId[],
    },
    reducers: {
        setInitialExceptedSampleIDs(state, action: PayloadAction<FMSId[]>) {
            state.initialExceptedSampleIDs = action.payload
        }
    },
})

export const actions = slice.actions;
export const { setInitialExceptedSampleIDs } = actions
export default slice.reducer