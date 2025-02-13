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
	return useMemo(() => {
		const listPageCallback = (pageNumber: number) => {
			return dispatch(pagedItemActions.listPage(pageNumber))
		}

		const setFixedFilterCallback = (filter: FilterSetting) => {
			return dispatch(pagedItemActions.setFixedFilter(filter))
		}

		const setFilterCallback = (value: FilterValue, description: FilterDescription) => {
			return dispatch(pagedItemActions.setFilter(value, description))
		}

		const setFilterOptionsCallback = (description: FilterDescription, options: FilterOptions) => {
			return dispatch(pagedItemActions.setFilterOptions(description, options))
		}

		const clearFiltersCallback = () => {
			return dispatch(pagedItemActions.clearFilters())
		}

		const clearFixedFiltersCallback = () => {
			return dispatch(pagedItemActions.clearFixedFilters())
		}

		const setSortByCallback = (sortByList: SortBy[]) => {
			return dispatch(pagedItemActions.setSortBy(sortByList))
		}

		const setPageSizeCallback =(pageSize: number) => {
			return dispatch(pagedItemActions.setPageSize(pageSize))
		}

		const resetPagedItemsCallback = () => {
			return dispatch(pagedItemActions.resetPagedItems())
		}

		const setStaleCallback = (stale: boolean) => {
			return dispatch(pagedItemActions.setStale(stale))
		}

		const refreshPageCallback = () => {
			return dispatch(pagedItemActions.refreshPage())
		}

		return {
			listPageCallback,
			setFixedFilterCallback,
			setFilterCallback,
			setFilterOptionsCallback,
			clearFiltersCallback,
			clearFixedFiltersCallback,
			setSortByCallback,
			setPageSizeCallback,
			resetPagedItemsCallback,
			setStaleCallback,
			refreshPageCallback,	
		}
	}, [dispatch, pagedItemActions])
}
