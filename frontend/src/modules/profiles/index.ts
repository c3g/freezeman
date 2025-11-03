import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { FMSId, FMSProfile } from "../../models/fms_api_models"

interface ProfilesState {
    itemsByID: Record<FMSId, FMSProfile>
}

export const slice = createSlice({
    name: "profiles",
    initialState: { itemsByID: {} } as ProfilesState,
    reducers: {
        getProfile: (state, action: PayloadAction<FMSProfile>) => {
            state.itemsByID[action.payload.id] = action.payload
        },
    }
})

export const { getProfile } = slice.actions
export default slice.reducer