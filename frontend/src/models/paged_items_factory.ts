import { AnyAction, Reducer } from "redux"
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/shared/WorkflowSamplesTable/serializeFilterParamsTS"
import { selectPageSize } from "../selectors"
import { AppDispatch, RootState } from "../store"
import { NetworkActionListReceive, NetworkActionThunk, NetworkActionTypes, createNetworkActionTypes, networkAction } from "../utils/actions"
import { FMSId } from "./fms_api_models"
import { FilterDescription, FilterOptions, FilterSetting, FilterValue, PagedItems, SortBy } from "./paged_items"
import { reduceClearFilters, reduceListError, reduceListReceive, reduceListRequest, reduceRemoveFilter, reduceSetFilter, reduceSetFilterOptions, reduceSetFixedFilter, reduceSetPageSize, reduceSetSortBy } from "./paged_items_reducers"

type FreezemanThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => T
type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>

  type SetFixedFilterAction = {
		type: string
		filter: FilterSetting
  }

export interface PagedItemsActions {
	listPage: (pageNumber: number) => FreezemanAsyncThunk<FMSId[]>
	refreshPage: () => FreezemanAsyncThunk<FMSId[]>
	setFixedFilter: (filter: FilterSetting) => SetFixedFilterAction
	setFilter: (value: FilterValue, description: FilterDescription) => FreezemanAsyncThunk<FMSId[]>
	setFilterOptions: (description: FilterDescription, options: FilterOptions) => FreezemanAsyncThunk<FMSId[]>
	removeFilter: (description: FilterDescription) => FreezemanAsyncThunk<FMSId[]>
	clearFilters: () => FreezemanAsyncThunk<FMSId[]>
	setSortBy: (sortBy: SortBy) => FreezemanAsyncThunk<FMSId[]>
	setPageSize: (pageSize: number) => FreezemanAsyncThunk<FMSId[]>
}

export type SetFilterActionType = PagedItemsActions['setFilter']
export type SetFilterOptionsActionType = PagedItemsActions['setFilterOptions']

// Define a type alias for the list function signature
type ListType = (option: any) => NetworkActionThunk<any>;


interface PagedItemsActionTypes {
	LIST_PAGE: NetworkActionTypes
	SET_FIXED_FILTER: string
	SET_FILTER: string
	SET_FILTER_OPTIONS: string
	REMOVE_FILTER: string
	CLEAR_FILTERS: string
	SET_SORT_BY: string
	SET_PAGE_SIZE: string
}

export function createPagedItemsActionTypes(prefix: string): PagedItemsActionTypes {
    return {
        LIST_PAGE: createNetworkActionTypes(`${prefix}.LIST_PAGE`),
        SET_FIXED_FILTER: `${prefix}.SET_FIXED_FILTER`,
        SET_FILTER: `${prefix}.SET_FILTER`,
        SET_FILTER_OPTIONS: `${prefix}.SET_FILTER_OPTIONS`,
        REMOVE_FILTER: `${prefix}.REMOVE_FILTER`,
        CLEAR_FILTERS: `${prefix}.CLEAR_FILTER`,
        SET_SORT_BY: `${prefix}.SET_SORT_BY`,
        SET_PAGE_SIZE: `${prefix},SET_PAGE_SIZE`,
    }
}


// The actions need to be able to find the paged items state they operate on, so we
// need a function that returns the PagedItems. Normally this is just a selector,
// but if the paged items is embedded in an index object or other type of collection
// then a custom function will need to be implemented by the component that uses the state.
export type SelectPagedItemsFunc = (state: RootState) => PagedItems

export function createPagedItemsActions(actionTypes: PagedItemsActionTypes, selectPagedItems: SelectPagedItemsFunc, list: ListType): PagedItemsActions {

    const { LIST_PAGE, SET_FIXED_FILTER, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE } =
		actionTypes

    const listPage: PagedItemsActions['listPage'] = (pageNumber) => async (dispatch, getState) => {     
        const pagedItems = selectPagedItems(getState())
        const limit = pagedItems.page?.limit ?? selectPageSize(getState())
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
        const meta = { ...params, pageNumber, ignoreError: 'AbortError' }

        // TODO: Listing items doesn't put the items into an ItemsByID automatically any more, since PagedItems
        // only contains a list of object ID's, and no longer has the objects themselves. For example, the 
        // `projectsOfSamples` state has a list of project id's associated with a sample, but not the projects
        // themselves. When we list the projects here, we need to somehow get the projects stored in
        // state.projects.itemsByID, or wherever we decide to store projects in the future.

        const { results } = await dispatch<Promise<{ results: FMSId[] }>>(networkAction(LIST_PAGE, list(params), {meta}))

        return results
    }

    const refreshPage: PagedItemsActions['refreshPage'] = () => async (dispatch, getState) => {
        const pagedItems = selectPagedItems(getState())
        return await dispatch(listPage(pagedItems.page?.pageNumber ?? 1))
    }

    const setFixedFilter: PagedItemsActions['setFixedFilter'] = (filter: FilterSetting) => {
        return ({
			type: SET_FIXED_FILTER,
			filter
		})
    }

    const setFilter: PagedItemsActions['setFilter'] = (value, description) => async (dispatch) => {
        dispatch({
            type: SET_FILTER,
            description: description,
            value: value
        })

        return await dispatch(listPage(1))
    }

    const setFilterOptions: PagedItemsActions['setFilterOptions'] = (description, options) => async (dispatch) => {
        dispatch({
            type: SET_FILTER_OPTIONS,
            description,
            options
        })
        return await dispatch(listPage(1))
    }

    const removeFilter: PagedItemsActions['removeFilter'] = (description) => async (dispatch) => {
        dispatch({
            type: REMOVE_FILTER,
            description: description,
        })

        return await dispatch(listPage(1))
    }

    const clearFilters: PagedItemsActions['clearFilters'] = () => async (dispatch) => {
        dispatch({ type: CLEAR_FILTERS })
        return await dispatch(listPage(1))
    }

    const setSortBy: PagedItemsActions['setSortBy'] = (sortBy) => async (dispatch) => {
        dispatch({
            type: SET_SORT_BY,
            sortBy
        })

        return await dispatch(listPage(1))
    }

    const setPageSize: PagedItemsActions['setPageSize'] = (pageSize) => async (dispatch) => {
        dispatch({
            type: SET_PAGE_SIZE,
            pageSize
        })
        return await dispatch(listPage(1))
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
        setPageSize
    }

    return actions
}


// This reducer will support any state that extends PagedItems.
export function createPagedItemsReducer<P extends PagedItems>(actionTypes: PagedItemsActionTypes, initialState: P): Reducer<P, AnyAction> {
    const { LIST_PAGE, SET_FIXED_FILTER, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE } = actionTypes

    function reduce(state: P = initialState, action: AnyAction): P {
        switch (action.type) {
			case LIST_PAGE.REQUEST: {
				return reduceListRequest(state)
			}
			case LIST_PAGE.RECEIVE: {
				const { data, meta } = action as NetworkActionListReceive
				return reduceListReceive(state, {
					items: data.results,
					pageSize: meta.limit,
					totalCount: data.count,
					pageNumber: meta.pageNumber,
				})
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
			default: {
				return state
			}
		}
    }

    return reduce
}
