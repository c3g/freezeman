import { useAppSelector } from "../hooks"
import { selectAuthState, selectUsersByID } from "../selectors"

/**
 * Returns the currently logged in user. 
 * 
 * Returns undefined if the user ID hasn't been set, or if the user ID doesn't
 * match any of the user definitions.
 * 
 * @returns User | undefined
 */
export function useCurrentUser() {
	const usersById = useAppSelector(selectUsersByID)
	const authState = useAppSelector(selectAuthState)

	if (usersById && authState.currentUserID) {
		return usersById[authState.currentUserID]
	}
	return undefined
}