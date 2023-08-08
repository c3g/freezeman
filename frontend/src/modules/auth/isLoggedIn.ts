import { selectAuthCurrentUserID, selectAuthTokenAccess } from "../../selectors"
import { RootState } from "../../store"

/**
 * Checks to see if the user is logged in. The user is logged in if their user ID and
 * auth tokens are currently stored in the auth redux state.
 * 
 * Note that this does not guarantee that the user's token is still valid.
 * 
 * This function should be used for checking if the user is logged in, rather than
 * checking different parts of the auth state independently.
 * 
 * @param state RootState
 * @returns boolean
 */
export function isUserLoggedIn(state: RootState) {
	const userID = selectAuthCurrentUserID(state)
	const token = selectAuthTokenAccess(state)

	return !!(userID) && !!(token)
}