import { FMSId, FMSTrackedModel } from "../models/fms_api_models";
import { AppDispatch, RootState } from "../store";
import { AnyAction, Reducer } from "redux";
import { FilterDescription, FilterOptions, FilterValue, PagedItems, SortBy, initPagedItems } from "../models/paged_items";
import { NetworkActionListReceive, NetworkActionThunk, NetworkActionTypes, createNetworkActionTypes, networkAction } from "./actions";
import { reduceClearFilters, reduceListError, reduceListReceive, reduceListRequest, reduceRemoveFilter, reduceSetFilter, reduceSetFilterOptions, reduceSetPageSize, reduceSetSortBy } from "../models/paged_items_reducers";
import { selectPageSize } from "../selectors";
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/shared/WorkflowSamplesTable/serializeFilterParamsTS";

type FreezemanThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => T
type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>

export interface PagedItemsActions {
    listPage: (pageNumber: number) => FreezemanAsyncThunk<FMSId[]>
    refreshPage: () => FreezemanAsyncThunk<FMSId[]>
    setFilter: (value: FilterValue, description: FilterDescription) => FreezemanAsyncThunk<FMSId[]>
    setFilterOptions: (description: FilterDescription, options: FilterOptions) => FreezemanAsyncThunk<FMSId[]>
    removeFilter: (description: FilterDescription) => FreezemanAsyncThunk<FMSId[]>
    clearFilters: () => FreezemanAsyncThunk<FMSId[]>
    setSortBy: (sortBy: SortBy) => FreezemanAsyncThunk<FMSId[]>
    setPageSize: (pageSize: number) => FreezemanAsyncThunk<FMSId[]>
}

// Define a type alias for the list function signature
type ListType = (option: any) => NetworkActionThunk<any>;


interface PagedItemsActionTypes {
    LIST_PAGE: NetworkActionTypes,
    SET_FILTER: string,
    SET_FILTER_OPTIONS: string,
    REMOVE_FILTER: string,
    CLEAR_FILTERS: string,
    SET_SORT_BY: string,
    SET_PAGE_SIZE: string
}

export function createPagedItemsActionTypes(prefix: string): PagedItemsActionTypes {
    return {
        LIST_PAGE: createNetworkActionTypes(`${prefix}.LIST_PAGE`),
        SET_FILTER: `${prefix}.SET_FILTER`,
        SET_FILTER_OPTIONS: `${prefix}.SET_FILTER_OPTIONS`,
        REMOVE_FILTER: `${prefix}.REMOVE_FILTER`,
        CLEAR_FILTERS: `${prefix}.CLEAR_FILTER`,
        SET_SORT_BY: `${prefix}.SET_SORT_BY`,
        SET_PAGE_SIZE: `${prefix},SET_PAGE_SIZE`,
    }
}

export function createPagedItemsActions<T extends FMSTrackedModel>(actionTypes: PagedItemsActionTypes, prefix: string, list: ListType): PagedItemsActions {

    const { LIST_PAGE, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE } = actionTypes

    const listPage: PagedItemsActions['listPage'] = (pageNumber) => async (dispatch, getState) => {
        const state = getState()
        const pagedItems = state[prefix] as PagedItems<T>
        
        const limit = pagedItems.page?.limit ?? selectPageSize(state)
        const offset = limit * (pageNumber - 1)
        const { filters, fixedFilters, sortBy } = pagedItems

        const serializedFilters = serializeFilterParamsWithDescriptions({ ...fixedFilters, ...filters })
		const ordering = serializeSortByParams(sortBy)

        const { results } = await dispatch<Promise<{ results: FMSId[] }>>(networkAction(LIST_PAGE, list({
            offset,
            ...serializedFilters,
            ordering,
            limit
        })))
        return results
    }

    const refreshPage: PagedItemsActions['refreshPage'] = () => async (dispatch, getState) => {
        return await dispatch(listPage((getState()[prefix] as PagedItems<T>).page?.pageNumber ?? 1))
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
        setFilter,
        setFilterOptions,
        removeFilter,
        clearFilters,
        setSortBy,
        setPageSize
    }

    return actions
}

export function createPagedItemsReducer<T extends FMSTrackedModel>(actionTypes: PagedItemsActionTypes): Reducer<PagedItems<T>, AnyAction> {
    const { LIST_PAGE, SET_FILTER, SET_FILTER_OPTIONS, REMOVE_FILTER, CLEAR_FILTERS, SET_SORT_BY, SET_PAGE_SIZE } = actionTypes

    return (oldState, action) => {
        const state = oldState ?? initPagedItems()
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
                    pageNumber: Math.floor(meta.offset / meta.limit + 1),
                })
            }
            case LIST_PAGE.ERROR: {
                return reduceListError(state, action.error)
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
}
