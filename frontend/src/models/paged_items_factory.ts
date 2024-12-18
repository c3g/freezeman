import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/pagedItemsTable/serializeFilterParamsTS"
import { NetworkActionTypes, createNetworkActionTypes } from "../utils/actions"
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
import { FMSResponse } from "../utils/api"
import { FMSPagedResultsReponse, FMSTrackedModel } from "./fms_api_models"

export interface PagedItemsActions<Prefix extends string> {
	listPage: (pageNumber: number) => Promise<void>
	refreshPage: () => Promise<void>
	setFixedFilter: (filter: FilterSetting) => SetFixedFilterAction<Prefix>
	setFilter: (value: FilterValue, description: FilterDescription) => Promise<void>
	setFilterOptions: (description: FilterDescription, options: FilterOptions) => Promise<void>
	removeFilter: (description: FilterDescription) => Promise<void>
	clearFilters: () => Promise<void>
	setSortBy: (sortBy: SortBy) => Promise<void>
	setPageSize: (pageSize: number) => Promise<void>
    resetPagedItems: () => Promise<void>
    setStale: (stale: boolean) => Promise<void>
}

interface PagedItemAction<Prefix extends string> {
    type: PagedItemsActionType<Prefix>,
    [key: string]: any
}

interface SetFixedFilterAction<Prefix extends string> extends PagedItemAction<Prefix> {
    type: SetFixedFilterActionType<Prefix>
    filter: FilterSetting
}

type PrefixedActionType<T extends string, Prefix extends string> = `${Prefix}.${T}`

type ListPageActionType<Prefix extends string> = NetworkActionTypes<PrefixedActionType<'LIST_PAGE', Prefix>>
type SetFixedFilterActionType<Prefix extends string> = PrefixedActionType<`SET_FIXED_FILTER`, Prefix>
type SetFilterActionType<Prefix extends string> = PrefixedActionType<`SET_FILTER`, Prefix>
type SetFilterOptionsActionType<Prefix extends string> = PrefixedActionType<`SET_FILTER_OPTIONS`, Prefix>
type RemoveFilterActionType<Prefix extends string> = PrefixedActionType<`REMOVE_FILTER`, Prefix>
type ClearFiltersActionType<Prefix extends string> = PrefixedActionType<`CLEAR_FILTERS`, Prefix>
type SetSortByActionType<Prefix extends string> = PrefixedActionType<`SET_SORT_BY`, Prefix>
type SetPageSizeActionType<Prefix extends string> = PrefixedActionType<`SET_PAGE_SIZE`, Prefix>
type ResetPagedItemsActionType<Prefix extends string> = PrefixedActionType<`RESET_PAGED_ITEMS`, Prefix>
type SetStaleActionType<Prefix extends string> = PrefixedActionType<`SET_STALE`, Prefix>

type PagedItemsActionType<Prefix extends string> =
    | ListPageActionType<Prefix>[keyof ListPageActionType<Prefix>]
    | SetFixedFilterActionType<Prefix>
    | SetFilterActionType<Prefix>
    | SetFilterOptionsActionType<Prefix>
    | RemoveFilterActionType<Prefix>
    | ClearFiltersActionType<Prefix>
    | SetSortByActionType<Prefix>
    | SetPageSizeActionType<Prefix>
    | ResetPagedItemsActionType<Prefix>
    | SetStaleActionType<Prefix>

interface PagedActionTypes<Prefix extends string> {
    LIST_PAGE: ListPageActionType<Prefix>
    SET_FIXED_FILTER: SetFixedFilterActionType<Prefix>
    SET_FILTER: SetFilterActionType<Prefix>
    SET_FILTER_OPTIONS: SetFilterOptionsActionType<Prefix>
    REMOVE_FILTER: RemoveFilterActionType<Prefix>
    CLEAR_FILTERS: ClearFiltersActionType<Prefix>
    SET_SORT_BY: SetSortByActionType<Prefix>
    SET_PAGE_SIZE: SetPageSizeActionType<Prefix>
    RESET_PAGED_ITEMS: ResetPagedItemsActionType<Prefix>
    SET_STALE: SetStaleActionType<Prefix>
}

function prefixType<Type extends string, Prefix extends string>(type: Type, prefix: Prefix): PrefixedActionType<Type, Prefix> {
    return `${prefix}.${type}`
}
function createActionsTypes<Prefix extends string>(prefix: Prefix): PagedActionTypes<Prefix> {
    return {
        LIST_PAGE: createNetworkActionTypes(prefixType('LIST_PAGE', prefix)),
        SET_FIXED_FILTER: prefixType('SET_FIXED_FILTER', prefix),
        SET_FILTER: prefixType('SET_FILTER', prefix),
        SET_FILTER_OPTIONS: prefixType('SET_FILTER_OPTIONS', prefix),
        REMOVE_FILTER: prefixType('REMOVE_FILTER', prefix),
        CLEAR_FILTERS: prefixType('CLEAR_FILTERS', prefix),
        SET_SORT_BY: prefixType('SET_SORT_BY', prefix),
        SET_PAGE_SIZE: prefixType('SET_PAGE_SIZE', prefix),
        RESET_PAGED_ITEMS: prefixType('RESET_PAGED_ITEMS', prefix),
        SET_STALE: prefixType('SET_STALE', prefix),
    }
}

// Define a type alias for the list function signature
type ListFuncType<T> = (option: any) => Promise<FMSResponse<FMSPagedResultsReponse<T>>['data']>

function _createPagedItemsActions<M extends FMSTrackedModel, Prefix extends string>(
    list: ListFuncType<M>,
    selectPagedItems: () => PagedItems,
    selectPageSize: () => number,
    dispatch: (action: PagedItemAction<Prefix>) => void,
    prefix: Prefix,
    extra?: object,
): PagedItemsActions<Prefix> {
    const {
        LIST_PAGE,
        SET_FIXED_FILTER,
        SET_FILTER,
        SET_FILTER_OPTIONS,
        REMOVE_FILTER,
        CLEAR_FILTERS,
        SET_SORT_BY,
        SET_PAGE_SIZE,
        RESET_PAGED_ITEMS,
        SET_STALE
    } = createActionsTypes(prefix)

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
    const listPage: PagedItemsActions<Prefix>['listPage'] = async (pageNumber) => {
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
    const _fetchPage: PagedItemsActions<Prefix>['listPage'] = async (pageNumber) => {     

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

    const refreshPage: PagedItemsActions<Prefix>['refreshPage'] = async () => {
        const pagedItems = selectPagedItems()
        return await _fetchPage(pagedItems.page?.pageNumber ?? 1)
    }

    const setFixedFilter: PagedItemsActions<Prefix>['setFixedFilter'] = (filter: FilterSetting) => {
        return ({
			type: SET_FIXED_FILTER,
			filter,
            extra
		})
    }

    const setFilter: PagedItemsActions<Prefix>['setFilter'] = async (value, description) => {
        dispatch({
            type: SET_FILTER,
            description: description,
            value: value,
            extra
        })

        return await _fetchPage(1)
    }

    const setFilterOptions: PagedItemsActions<Prefix>['setFilterOptions'] = async (description, options) => {
        dispatch({
            type: SET_FILTER_OPTIONS,
            description,
            options,
            extra
        })
        return await _fetchPage(1)
    }

    const removeFilter: PagedItemsActions<Prefix>['removeFilter'] = async (description) => {
        dispatch({
            type: REMOVE_FILTER,
            description: description,
            extra
        })

        return await _fetchPage(1)
    }

    const clearFilters: PagedItemsActions<Prefix>['clearFilters'] = async () => {
        dispatch({ type: CLEAR_FILTERS, extra })
        return await _fetchPage(1)
    }

    const setSortBy: PagedItemsActions<Prefix>['setSortBy'] = async (sortBy) => {
        dispatch({
            type: SET_SORT_BY,
            sortBy,
            extra
        })

        return await _fetchPage(1)
    }

    const setPageSize: PagedItemsActions<Prefix>['setPageSize'] = async (pageSize) => {
        dispatch({
            type: SET_PAGE_SIZE,
            pageSize,
            extra
        })
        return await _fetchPage(1)
    }

    const resetPagedItems: PagedItemsActions<Prefix>['resetPagedItems'] = async () => {
        dispatch({
            type: RESET_PAGED_ITEMS,
            extra
        })
    }

    const setStale: PagedItemsActions<Prefix>['setStale'] = async (stale) => {
        dispatch({
            type: SET_STALE,
            stale,
            extra
        })
    }

    const actions: PagedItemsActions<Prefix> = {
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
export function createPagedItemsReducer<P extends PagedItems, Prefix extends string>(initialState: P, prefix: Prefix): (state: P, action: PagedItemAction<Prefix>) => P {
    const { LIST_PAGE, SET_FIXED_FILTER, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE, RESET_PAGED_ITEMS, SET_STALE } = createActionsTypes(prefix)

    function reduce(state: P = initialState, action: PagedItemAction<Prefix>): P {
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
