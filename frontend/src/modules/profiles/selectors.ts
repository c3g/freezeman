import { createSelector } from "@reduxjs/toolkit"
import { selectAuthCurrentUserID, selectUsersByID } from "../../selectors"
import { RootState } from "../../store"
import { FMSProfilePreferences } from "../../models/fms_api_models"

export const selectProfileByID = (state: RootState) => state.profiles.itemsByID

export const selectCurrentUserProfile = createSelector(
    [selectAuthCurrentUserID, selectUsersByID, selectProfileByID],
    (currentUserID, usersByID, profilesByID) => {
        if (currentUserID && currentUserID in usersByID) {
            return profilesByID[usersByID[Number(currentUserID)].profile]
        }
        return undefined
    }
)

const DEFAULT_PREFERENCES: FMSProfilePreferences = {
    'table.sample.page-limit': 20,
}
export const selectCurrentPreferences = createSelector(
    [selectCurrentUserProfile],
    (profile) => {
        return profile ? profile.preferences : DEFAULT_PREFERENCES
    }
)
