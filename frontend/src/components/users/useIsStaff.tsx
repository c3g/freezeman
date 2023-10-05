import { useMemo } from "react"
import { useAppSelector } from "../../hooks"
import { selectAuthState, selectUsersByID } from "../../selectors"

/**
 * This hook can be used to check if the currently logged in user is Staff.
 * 
 * @returns boolean
 */
export function useIsStaff() {
	const auth = useAppSelector(selectAuthState)
	const usersByID = useAppSelector(selectUsersByID)
	const { currentUserID } = auth

	const isStaff = useMemo(() => {
		if (currentUserID) {
			const currentUser = usersByID[currentUserID]
			if(currentUser) {
				return currentUser.is_staff
			}
		}
		return false
	}, [currentUserID, usersByID])
	return isStaff
}