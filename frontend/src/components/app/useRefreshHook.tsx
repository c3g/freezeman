import { useEffect, useState } from 'react'
import { useAppDispatch } from '../../hooks'
import { refreshAuthToken } from '../../modules/auth/actions'
import { fetchLabworkSummary, fetchSummariesData } from '../../modules/shared/actions'

/*
	This hook runs an interval that refreshes the user's auth token and also fetches
	summaries. The interval runs while the user is logged in, and stops if the user
	is logged out.

	Ideally, auth would be independent of summaries, but it's important that we don't
	try to fetch summaries at the same time that the auth token is being refreshed.
	If they happen at the same time, we can have a summaries action queued which contains
	a stale token, and the resulting 403 error causes us to log out the user.

	In this loop, we first refresh the token and then fetch summaries to avoid this problem.
	(In the future we may find a better way to avoid this kind of issue.)
*/

const REFRESH_INTERVAL = 30 * 1000

export function useRefreshHook(isLoggedIn: boolean) {
	const dispatch = useAppDispatch()
	const [refreshInterval, setRefreshInterval] = useState<number | undefined>()

	useEffect(() => {
		if (isLoggedIn) {
			// Start refresh if the user has logged in and we don't
			// already have an interval running.
			if (!refreshInterval) {
				const interval = setInterval(async () => {
					const hasValidToken = await dispatch(refreshAuthToken())
					if (hasValidToken) {
						dispatch(fetchSummariesData())
						dispatch(fetchLabworkSummary())
					}
				}, REFRESH_INTERVAL)
				setRefreshInterval(interval)
			}
		} else {
			// Stop the refresh if the user is no longer logged in.
			if (refreshInterval) {
				clearInterval(refreshInterval)
				setRefreshInterval(undefined)
			}
		}
	}, [isLoggedIn, refreshInterval, dispatch])
}
