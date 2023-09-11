import { useCallback } from 'react'
import { PagedItems } from '../../models/paged_items'
import { PagedItemsActionsCallbacks } from './PagedItemsTable'


/**
 * This hook creates a callback that automatically refreshes the table if
 * the stale flag in PagedItems is set. The flag is cleared and the table
 * items are refreshed.
 * 
 * PagedItems table will call the callback whenever the paged items state changes,
 * to check for the stale flag.
 * @param pagedItemActions 
 * @returns 
 */
export function useRefreshWhenStale(refreshPageCallback: PagedItemsActionsCallbacks['refreshPageCallback'], setStaleCallback: PagedItemsActionsCallbacks['setStaleCallback']) {
	const refreshWhenStale = useCallback((stale: PagedItems['stale']) => {
		if (stale) {
			refreshPageCallback()
			setStaleCallback(false)
		}
	}, [refreshPageCallback, setStaleCallback])

	return refreshWhenStale
}