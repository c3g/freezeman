import { useMemo } from 'react'
import { useAppDispatch } from '../../hooks'
import { FilterDescription, FilterOptions, FilterSetting, FilterValue, SortBy } from '../../models/paged_items'
import { PagedItemsActions } from '../../models/paged_items_factory'
import { PagedItemsActionsCallbacks } from './PagedItemsTable'


/**
 * Given an instance of PagedItemsActions, this hook returns a set of callbacks
 * that are given to the PagedItemsTable, and which will dispatch the actions
 * when called from the table.
 * 
 * This is just a utility to make it easy to pass the callbacks to the table, when
 * you don't need to implement custom callbacks for the table functions.
 * 
 * @param pagedItemActions 
 * @returns 
 */
export function usePagedItemsActionsCallbacks(pagedItemActions: PagedItemsActions): PagedItemsActionsCallbacks {
	const dispatch = useAppDispatch()
	return useMemo(() => ({
		listPageCallback: (pagedNumber: number) => dispatch(pagedItemActions.listPage(pagedNumber)),
		setFilterCallback: (filterID: string, value: FilterValue, description: FilterDescription, fetch = true) => dispatch(pagedItemActions.setFilter(filterID, value, description, fetch)),
		setFilterOptionsCallback: (filterID: string, options: FilterOptions, fetch = true) => dispatch(pagedItemActions.setFilterOptions(filterID, options, fetch)),
		setFilterFixedCallback: (filterID: string, fixed: boolean) => dispatch(pagedItemActions.setFilterFixed(filterID, fixed)),
		removeFilterCallback: (filterID: string, fetch = true) => dispatch(pagedItemActions.removeFilter(filterID, fetch)),
		clearFiltersCallback: (fetch = true) => dispatch(pagedItemActions.clearFilters(fetch)),
		setSortByCallback: (sortByList: SortBy[]) => dispatch(pagedItemActions.setSortBy(sortByList)),
		setPageSizeCallback: (pageSize: number) => dispatch(pagedItemActions.setPageSize(pageSize)),
		resetPagedItemsCallback: () => dispatch(pagedItemActions.resetPagedItems()),
		setStaleCallback: (stale: boolean) => dispatch(pagedItemActions.setStale(stale)),
		refreshPageCallback: () => dispatch(pagedItemActions.refreshPage()),
	}), [dispatch, pagedItemActions])
}
