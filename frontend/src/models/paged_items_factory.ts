import { AnyAction, Reducer } from "redux"
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/pagedItemsTable/serializeFilterParamsTS"
import { selectPageSize } from "../selectors"
import { AppDispatch, RootState } from "../store"
import { NetworkActionThunk, NetworkActionTypes, createNetworkActionTypes } from "../utils/actions"
import { FilterDescription, FilterOptions, FilterSetting, FilterValue, PagedItems, SortBy } from "./paged_items"
import {
	ReduceListReceiveType,
	reduceClearFilters,
	reduceListError,
	reduceListReceive,
	reduceListRequest,
	reduceRemoveFilter,
	reduceResetPagedItems,
	reduceSetFilter,
	reduceSetFilterOptions,
	reduceSetFixedFilter,
	reduceSetPageSize,
	reduceSetSortBy,
    reduceSetStale,
} from './paged_items_reducers'

export type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>

  type SetFixedFilterAction = {
		type: string
		filter: FilterSetting
  }

export interface PagedItemsActions {
	listPage: (pageNumber: number) => FreezemanAsyncThunk<void>
	refreshPage: () => FreezemanAsyncThunk<void>
	setFixedFilter: (filter: FilterSetting) => SetFixedFilterAction
	setFilter: (value: FilterValue, description: FilterDescription) => FreezemanAsyncThunk<void>
	setFilterOptions: (description: FilterDescription, options: FilterOptions) => FreezemanAsyncThunk<void>
	removeFilter: (description: FilterDescription) => FreezemanAsyncThunk<void>
	clearFilters: () => FreezemanAsyncThunk<void>
	setSortBy: (sortBy: SortBy) => FreezemanAsyncThunk<void>
	setPageSize: (pageSize: number) => FreezemanAsyncThunk<void>
    resetPagedItems: () => FreezemanAsyncThunk<void>
    setStale: (stale: boolean) => FreezemanAsyncThunk<void>
}

export type SetFilterActionType = PagedItemsActions['setFilter']
export type SetFilterOptionsActionType = PagedItemsActions['setFilterOptions']

// Define a type alias for the list function signature
type ListType = (option: any) => NetworkActionThunk<any>;


interface PagedItemsActionTypes<Prefix extends string> {
	LIST_PAGE: NetworkActionTypes<`${Prefix}.LIST_PAGE`>
	SET_FIXED_FILTER: `${Prefix}.SET_FIXED_FILTER`
	SET_FILTER: `${Prefix}.SET_FILTER`
	SET_FILTER_OPTIONS: `${Prefix}.SET_FILTER_OPTIONS`
	REMOVE_FILTER: `${Prefix}.REMOVE_FILTER`
	CLEAR_FILTERS: `${Prefix}.CLEAR_FILTER`
	SET_SORT_BY: `${Prefix}.SET_SORT_BY`
	SET_PAGE_SIZE: `${Prefix}.SET_PAGE_SIZE`
    RESET_PAGED_ITEMS: `${Prefix}.RESET_PAGED_ITEMS`
    SET_STALE: `${Prefix}.SET_STATE`
}

export function createPagedItemsActionTypes<Prefix extends string>(prefix: Prefix): PagedItemsActionTypes<Prefix> {
    return {
        LIST_PAGE: createNetworkActionTypes(`${prefix}.LIST_PAGE`),
        SET_FIXED_FILTER: `${prefix}.SET_FIXED_FILTER`,
        SET_FILTER: `${prefix}.SET_FILTER`,
        SET_FILTER_OPTIONS: `${prefix}.SET_FILTER_OPTIONS`,
        REMOVE_FILTER: `${prefix}.REMOVE_FILTER`,
        CLEAR_FILTERS: `${prefix}.CLEAR_FILTER`,
        SET_SORT_BY: `${prefix}.SET_SORT_BY`,
        SET_PAGE_SIZE: `${prefix}.SET_PAGE_SIZE`,
        RESET_PAGED_ITEMS: `${prefix}.RESET_PAGED_ITEMS`,
        SET_STALE: `${prefix}.SET_STATE`,
    }
}


// The actions need to be able to find the paged items state they operate on, so we
// need a function that returns the PagedItems. Normally this is just a selector,
// but if the paged items is embedded in an index object or other type of collection
// then a custom function will need to be implemented by the component that uses the state.
export type SelectPagedItemsFunc = (state: RootState) => PagedItems

export function createPagedItemsActions<Prefix extends string>(actionTypes: PagedItemsActionTypes<Prefix>, selectPagedItems: SelectPagedItemsFunc, list: ListType, extra?: object): PagedItemsActions {

    const { LIST_PAGE, SET_FIXED_FILTER, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE, RESET_PAGED_ITEMS, SET_STALE } =
		actionTypes


    /**
     * Get a page of items, specified by page number.
     * This is intended for components to use. Components can sometimes ask for the same page of data
     * multiple times. This action will only call the backend if the page has not already been loaded.
     * To force the page to be updated, use the refreshPage() action.
     * 
     * This is to protect us from accidentally spamming to server with an infinite loop of requests
     * for the same page of data, which happened in the past with PaginatedTable.
     * 
     * @param pageNumber The page number to list
     * @returns 
     */
    const listPage: PagedItemsActions['listPage'] = (pageNumber) => async (dispatch, getState) => {
		const pagedItems = selectPagedItems(getState())
		// If the page is already loaded then ignore this action. This protects against
		// components that go into an infinite loop of requesting items. If the items need to be
		// refreshed then the refreshPage() action should be used.
		if (pagedItems.page?.pageNumber) {
			if (pagedItems.page.pageNumber === pageNumber) {
				console.warn(`Ignored listPage action as page ${pageNumber} is already loaded.`)
				return
			}
		}

        // If the page is not already loaded then fetch the page.
        dispatch(_fetchPage(pageNumber))
	}

    /**
     * This is a private, internal action that fetches a page load of items, specified
     * by page number. It will fetch the page of items even if the page is already loaded.
     * It is used to force tables to refresh their contents.
     * 
     * @param pageNumber The page number to fetch
     * @returns 
     */
    const _fetchPage: PagedItemsActions['listPage'] = (pageNumber) => async (dispatch, getState) => {     

        const pagedItems = selectPagedItems(getState())

        // Dispatch the LIST_PAGE.REQUEST action
        dispatch({
            type: LIST_PAGE.REQUEST,
            extra
        })
        
        const limit = pagedItems.page?.limit ?? selectPageSize(getState())
        const offset = limit * (pageNumber - 1)
        const { filters, fixedFilters, sortBy } = pagedItems

        const serializedFilters = serializeFilterParamsWithDescriptions({ ...fixedFilters, ...filters })
		const ordering = serializeSortByParams(sortBy)

        const params = {
            withMetrics: true,
			offset,
			limit,
			ordering,
			...serializedFilters,
		}

        // Note: We dispatch a `list` action here(eg. the "list" action from the projects actions in actions.js).
        // The list action will dispatch the REQUEST/RECEIVE/ERROR actions for the type of item we are listing (eg. projects),
        // which will ensure that the retrieved projects are stored in redux before this action completes.
        // After listing the projects, we dispatch the LIST_PAGE action to updated the paged items state with
        // the list of id's of the items, the count, the page size, etc.
        try {
            const reply = await dispatch(list(params))
            
            // The paged items reducer just needs the item ID's, not the actual
            // items that were retrieved, so extract the list of ID's from the data.
            const data: ReduceListReceiveType = {
				items: reply.results.map((item) => item.id),
				totalCount: reply.count,
                pageNumber: pageNumber,
                pageSize: limit
			}
            dispatch({
                type: LIST_PAGE.RECEIVE,
                data,
                extra
            })
        } catch(error) {
            dispatch({
                type: LIST_PAGE.ERROR,
                error,
                extra
            })
            return
        }
    }

    const refreshPage: PagedItemsActions['refreshPage'] = () => async (dispatch, getState) => {
        const pagedItems = selectPagedItems(getState())
        return await dispatch(_fetchPage(pagedItems.page?.pageNumber ?? 1))
    }

    const setFixedFilter: PagedItemsActions['setFixedFilter'] = (filter: FilterSetting) => {
        return ({
			type: SET_FIXED_FILTER,
			filter,
            extra
		})
    }

    const setFilter: PagedItemsActions['setFilter'] = (value, description) => async (dispatch) => {
        dispatch({
            type: SET_FILTER,
            description: description,
            value: value,
            extra
        })

        return await dispatch(_fetchPage(1))
    }

    const setFilterOptions: PagedItemsActions['setFilterOptions'] = (description, options) => async (dispatch) => {
        dispatch({
            type: SET_FILTER_OPTIONS,
            description,
            options,
            extra
        })
        return await dispatch(_fetchPage(1))
    }

    const removeFilter: PagedItemsActions['removeFilter'] = (description) => async (dispatch) => {
        dispatch({
            type: REMOVE_FILTER,
            description: description,
            extra
        })

        return await dispatch(_fetchPage(1))
    }

    const clearFilters: PagedItemsActions['clearFilters'] = () => async (dispatch) => {
        dispatch({ type: CLEAR_FILTERS, extra })
        return await dispatch(_fetchPage(1))
    }

    const setSortBy: PagedItemsActions['setSortBy'] = (sortBy) => async (dispatch) => {
        dispatch({
            type: SET_SORT_BY,
            sortBy,
            extra
        })

        return await dispatch(_fetchPage(1))
    }

    const setPageSize: PagedItemsActions['setPageSize'] = (pageSize) => async (dispatch) => {
        dispatch({
            type: SET_PAGE_SIZE,
            pageSize,
            extra
        })
        return await dispatch(_fetchPage(1))
    }

    const resetPagedItems: PagedItemsActions['resetPagedItems'] = () => async (dispatch) => {
        dispatch({
            type: RESET_PAGED_ITEMS,
            extra
        })
    }

    const setStale: PagedItemsActions['setStale'] = (stale) => async (dispatch) => {
        dispatch({
            type: SET_STALE,
            stale,
            extra
        })
    }

    const actions: PagedItemsActions = {
        listPage,
        refreshPage,
        setFixedFilter,
        setFilter,
        setFilterOptions,
        removeFilter,
        clearFilters,
        setSortBy,
        setPageSize,
        resetPagedItems,
        setStale
    }

    return actions
}


// This reducer will support any state that extends PagedItems.
export function createPagedItemsReducer<P extends PagedItems, Prefix extends string>(actionTypes: PagedItemsActionTypes<Prefix>, initialState: P): Reducer<P, AnyAction> {
    const { LIST_PAGE, SET_FIXED_FILTER, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE, RESET_PAGED_ITEMS, SET_STALE } = actionTypes

    function reduce(state: P = initialState, action: AnyAction): P {
        switch (action.type) {
			case LIST_PAGE.REQUEST: {
				return reduceListRequest(state)
			}
			case LIST_PAGE.RECEIVE: {
				return reduceListReceive(state, action.data as ReduceListReceiveType)
			}
			case LIST_PAGE.ERROR: {
				return reduceListError(state, action.error)
			}
            case SET_FIXED_FILTER: {
                return reduceSetFixedFilter(state, action.filter)
            }
			case SET_FILTER: {
				return reduceSetFilter(state, action.description, action.value)
			}
			case SET_FILTER_OPTIONS: {
				return reduceSetFilterOptions(state, action.description, action.options)
			}
			case REMOVE_FILTER: {
				return reduceRemoveFilter(state, action.description)
			}
			case CLEAR_FILTERS: {
				return reduceClearFilters(state)
			}
			case SET_SORT_BY: {
				return reduceSetSortBy(state, action.sortBy)
			}
			case SET_PAGE_SIZE: {
				return reduceSetPageSize(state, action.pageSize)
			}
            case RESET_PAGED_ITEMS: {
                return reduceResetPagedItems(state)
            }
            case SET_STALE: {
                return reduceSetStale(state, action.stale)
            }
			default: {
				return state
			}
		}
    }

    return reduce
}
