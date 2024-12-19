import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/pagedItemsTable/serializeFilterParamsTS"
import { NetworkActionTypes, createNetworkActionTypes } from "../utils/actions"
import { FilterDescription, FilterOptions, FilterSetting, FilterValue, PagedItems, SortBy, createPagedItems } from "./paged_items"
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
import { FMSPagedResultsReponse, FMSTrackedModel } from "./fms_api_models"
import { useReducer } from "react"

export interface PagedItemsActions {
	listPage: (pageNumber: number) => Promise<void>
	refreshPage: () => Promise<void>
	setFixedFilter: (filter: FilterSetting) => SetFixedFilterAction
	setFilter: (value: FilterValue, description: FilterDescription) => Promise<void>
	setFilterOptions: (description: FilterDescription, options: FilterOptions) => Promise<void>
	removeFilter: (description: FilterDescription) => Promise<void>
	clearFilters: () => Promise<void>
	setSortBy: (sortBy: SortBy) => Promise<void>
	setPageSize: (pageSize: number) => Promise<void>
    resetPagedItems: () => Promise<void>
    setStale: (stale: boolean) => Promise<void>
}

interface PagedItemAction {
    type: PagedItemsActionType,
    [key: string]: any
}

interface SetFixedFilterAction extends PagedItemAction {
    type: SetFixedFilterActionType
    filter: FilterSetting
}

type ListPageActionType = NetworkActionTypes<'LIST_PAGE'>
type SetFixedFilterActionType = `SET_FIXED_FILTER`
type SetFilterActionType = `SET_FILTER`
type SetFilterOptionsActionType = `SET_FILTER_OPTIONS`
type RemoveFilterActionType = `REMOVE_FILTER`
type ClearFiltersActionType = `CLEAR_FILTERS`
type SetSortByActionType = `SET_SORT_BY`
type SetPageSizeActionType = `SET_PAGE_SIZE`
type ResetPagedItemsActionType = `RESET_PAGED_ITEMS`
type SetStaleActionType = `SET_STALE`

type PagedItemsActionType =
    | ListPageActionType[keyof ListPageActionType]
    | SetFixedFilterActionType
    | SetFilterActionType
    | SetFilterOptionsActionType
    | RemoveFilterActionType
    | ClearFiltersActionType
    | SetSortByActionType
    | SetPageSizeActionType
    | ResetPagedItemsActionType
    | SetStaleActionType

const LIST_PAGE = createNetworkActionTypes('LIST_PAGE')
const SET_FIXED_FILTER = 'SET_FIXED_FILTER'
const SET_FILTER = 'SET_FILTER'
const SET_FILTER_OPTIONS = 'SET_FILTER_OPTIONS'
const REMOVE_FILTER = 'REMOVE_FILTER'
const CLEAR_FILTERS = 'CLEAR_FILTERS'
const SET_SORT_BY = 'SET_SORT_BY'
const SET_PAGE_SIZE = 'SET_PAGE_SIZE'
const RESET_PAGED_ITEMS = 'RESET_PAGED_ITEMS'
const SET_STALE = 'SET_STALE'

// Define a type alias for the list function signature
interface ListFuncOptions {
    offset: number
    limit: number
    ordering?: string
    [key: string]: any
}
export type PagedItemsListFuncType<T> = (options: ListFuncOptions) => Promise<FMSPagedResultsReponse<T>>

function createPagedItemsActions<M extends Pick<FMSTrackedModel, 'id'>>(
    list: PagedItemsListFuncType<M>,
    selectPagedItems: () => PagedItems,
    selectPageSize: () => number,
    dispatch: (action: PagedItemAction) => void,
    extra?: object,
): PagedItemsActions {

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
    const listPage: PagedItemsActions['listPage'] = async (pageNumber) => {
		const pagedItems = selectPagedItems()
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
        _fetchPage(pageNumber)
	}

    /**
     * This is a private, internal action that fetches a page load of items, specified
     * by page number. It will fetch the page of items even if the page is already loaded.
     * It is used to force tables to refresh their contents.
     * 
     * @param pageNumber The page number to fetch
     * @returns 
     */
    const _fetchPage: PagedItemsActions['listPage'] = async (pageNumber) => {     

        const pagedItems = selectPagedItems()

        // Dispatch the LIST_PAGE.REQUEST action
        dispatch({
            type: LIST_PAGE.REQUEST,
            extra
        })
        
        const limit = pagedItems.page?.limit ?? selectPageSize()
        const offset = limit * (pageNumber - 1)
        const { filters, fixedFilters, sortBy } = pagedItems

        const serializedFilters = serializeFilterParamsWithDescriptions({ ...fixedFilters, ...filters })
		const ordering = serializeSortByParams(sortBy)

        const params = {
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
            const reply = await list(params)
            
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

    const refreshPage: PagedItemsActions['refreshPage'] = async () => {
        const pagedItems = selectPagedItems()
        return await _fetchPage(pagedItems.page?.pageNumber ?? 1)
    }

    const setFixedFilter: PagedItemsActions['setFixedFilter'] = (filter: FilterSetting) => {
        return ({
			type: SET_FIXED_FILTER,
			filter,
            extra
		})
    }

    const setFilter: PagedItemsActions['setFilter'] = async (value, description) => {
        dispatch({
            type: SET_FILTER,
            description: description,
            value: value,
            extra
        })

        return await _fetchPage(1)
    }

    const setFilterOptions: PagedItemsActions['setFilterOptions'] = async (description, options) => {
        dispatch({
            type: SET_FILTER_OPTIONS,
            description,
            options,
            extra
        })
        return await _fetchPage(1)
    }

    const removeFilter: PagedItemsActions['removeFilter'] = async (description) => {
        dispatch({
            type: REMOVE_FILTER,
            description: description,
            extra
        })

        return await _fetchPage(1)
    }

    const clearFilters: PagedItemsActions['clearFilters'] = async () => {
        dispatch({ type: CLEAR_FILTERS, extra })
        return await _fetchPage(1)
    }

    const setSortBy: PagedItemsActions['setSortBy'] = async (sortBy) => {
        dispatch({
            type: SET_SORT_BY,
            sortBy,
            extra
        })

        return await _fetchPage(1)
    }

    const setPageSize: PagedItemsActions['setPageSize'] = async (pageSize) => {
        dispatch({
            type: SET_PAGE_SIZE,
            pageSize,
            extra
        })
        return await _fetchPage(1)
    }

    const resetPagedItems: PagedItemsActions['resetPagedItems'] = async () => {
        dispatch({
            type: RESET_PAGED_ITEMS,
            extra
        })
    }

    const setStale: PagedItemsActions['setStale'] = async (stale) => {
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
export function createPagedItemsReducer(initialState?: PagedItems): (state: PagedItems, action: PagedItemAction) => PagedItems {
    function reduce(state: PagedItems = initialState ?? createPagedItems(), action: PagedItemAction): PagedItems {
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

export function usePagedItems<M extends Pick<FMSTrackedModel, 'id'>>(list: PagedItemsListFuncType<M>, selectPageSize: () => number): [PagedItems, PagedItemsActions] {
    const [state, dispatch] = useReducer(createPagedItemsReducer(), createPagedItems())
    const actions = createPagedItemsActions(list, () => state, selectPageSize, dispatch)
    return [state, actions]
}