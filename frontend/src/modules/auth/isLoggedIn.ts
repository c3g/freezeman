import { selectAuthState } from "../../selectors"
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
	const authState = selectAuthState(state)
	return hasLoginInfo(authState)
}

type AuthState = RootState['auth']

/**
 * Utility function to check if a user ID and tokens are stored in auth state.
 * @param authState AuthState
 * @returns boolean
 */
export function hasLoginInfo(authState: AuthState) {
	return !!authState.currentUserID && !!authState.tokens?.access && !!authState.tokens?.refresh
}