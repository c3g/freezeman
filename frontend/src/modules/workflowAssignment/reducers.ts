import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FMSId } from "../../models/fms_api_models";

const slice = createSlice({
    name: 'WORKFLOW_ASSIGNMENT',
    initialState: {
        initialExceptSampleIDs: [] as FMSId[],
    },
    reducers: {
        setInitialExceptSampleIDs(state, action: PayloadAction<FMSId[]>) {
            console.info('Setting initial except sample IDs for workflow assignment', action.payload)
            state.initialExceptSampleIDs = action.payload
        }
    },
})

export const actions = slice.actions;
export const { setInitialExceptSampleIDs } = actions
export default slice.reducer