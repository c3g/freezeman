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
		setFilterCallback: (filterID: string, value: FilterValue, description: FilterDescription) => dispatch(pagedItemActions.setFilter(filterID, value, description)),
		setFilterOptionsCallback: (filterID: string, options: FilterOptions) => dispatch(pagedItemActions.setFilterOptions(filterID, options)),
		setFilterFixed: (filterID: string, fixed: boolean) => dispatch(pagedItemActions.setFilterFixed(filterID, fixed)),
		removeFilterCallback: (filterID: string) => dispatch(pagedItemActions.removeFilter(filterID)),
		clearFiltersCallback: () => dispatch(pagedItemActions.clearFilters()),
		setSortByCallback: (sortByList: SortBy[]) => dispatch(pagedItemActions.setSortBy(sortByList)),
		setPageSizeCallback: (pageSize: number) => dispatch(pagedItemActions.setPageSize(pageSize)),
		resetPagedItemsCallback: () => dispatch(pagedItemActions.resetPagedItems()),
		setStaleCallback: (stale: boolean) => dispatch(pagedItemActions.setStale(stale)),
		refreshPageCallback: () => dispatch(pagedItemActions.refreshPage()),
	}), [dispatch, pagedItemActions])
}
