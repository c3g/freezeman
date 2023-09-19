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
			dispatch(pagedItemActions.listPage(pageNumber))
		}

		const setFixedFilterCallback = (filter: FilterSetting) => {
			dispatch(pagedItemActions.setFixedFilter(filter))
		}

		const setFilterCallback = (value: FilterValue, description: FilterDescription) => {
			dispatch(pagedItemActions.setFilter(value, description))
		}

		const setFilterOptionsCallback = (description: FilterDescription, options: FilterOptions) => {
			dispatch(pagedItemActions.setFilterOptions(description, options))
		}

		const clearFiltersCallback = () => {
			dispatch(pagedItemActions.clearFilters())
		}

		const setSortByCallback = (sortBy: SortBy) => {
				dispatch(pagedItemActions.setSortBy(sortBy))
		}

		const setPageSizeCallback =(pageSize: number) => {
			dispatch(pagedItemActions.setPageSize(pageSize))
		}

		const resetPagedItemsCallback = () => {
			dispatch(pagedItemActions.resetPagedItems())
		}

		const setStaleCallback = (stale: boolean) => {
			dispatch(pagedItemActions.setStale(stale))
		}

		const refreshPageCallback = () => {
			dispatch(pagedItemActions.refreshPage())
		}

		return {
			listPageCallback,
			setFixedFilterCallback,
			setFilterCallback,
			setFilterOptionsCallback,
			clearFiltersCallback,
			setSortByCallback,
			setPageSizeCallback,
			resetPagedItemsCallback,
			setStaleCallback,
			refreshPageCallback,	
		}
	}, [dispatch, pagedItemActions])
}
