import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectAuthState } from '../../selectors'
import { hasLoginInfo } from '../../modules/auth/isLoggedIn'
import { refreshAuthToken } from '../../modules/auth/actions'

/*
	This hook manages the user's auth token for the App component.

	The auth state is persisted to local storage by the app. When the app loads,
	whatever user ID and tokens the user had are loaded into redux. We have to
	check for tokens, and refresh the access token if possible. If the token
	cannot be refreshed, the LOG_OUT action will get dispatched to clear the auth state.

	The App uses this to restore the auth state.
*/


export function useAuthInit() {
	
	const dispatch = useAppDispatch()
	const authState = useAppSelector(selectAuthState)
	const [tokenVerified, setTokenVerified] = useState(false)
	const isLoggedIn = tokenVerified && hasLoginInfo(authState)

	// At startup we have to verify the tokens that were stored in local storage
	// for auth, so that we can refresh the user's access token if possible.
	// If the user's refresh token has expired (or if there was no token to begin with)
	// then the auth state will be cleared and the user will get the login page.
	// We only do this once, when the app is loaded.
	useEffect(() => {

		async function verifyToken() {
			await dispatch(refreshAuthToken())
			setTokenVerified(true)
		}

		if (!tokenVerified) {
			verifyToken()
		}

	}, [tokenVerified, dispatch])

	return isLoggedIn
}
