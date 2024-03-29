import { useMemo } from "react"
import { useAppSelector } from "../../hooks"
import { selectAuthState, selectUsersByID } from "../../selectors"

/**
 * Checks to see if the currently logged in user has "write" access, ie. if they are staff
 * or a superuser.
 * @returns boolean
 */
export function useCanWrite() {
	const auth = useAppSelector(selectAuthState)
	const usersByID = useAppSelector(selectUsersByID)
	const { currentUserID } = auth

	const canWrite = useMemo(() => {
		if (currentUserID) {
			const currentUser = usersByID[currentUserID]
			if(currentUser) {
				return currentUser.is_staff || currentUser.is_superuser
			}
		}
		return false
	}, [currentUserID, usersByID])
	return canWrite
}