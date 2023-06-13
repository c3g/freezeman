import { ThunkAction } from "redux-thunk";
import { FMSTrackedModel } from "../models/fms_api_models";
import { AppDispatch, RootState } from "../store";
import { AnyAction, Reducer } from "redux";
import { FilterDescription, FilterValue, PagedItems, initPagedItems } from "../models/paged_items";
import { NetworkActionListReceive, NetworkActionThunk, createNetworkActionTypes, networkAction } from "./actions";
import { reduceClearFilters, reduceListError, reduceListReceive, reduceListRequest, reduceRemoveFilter, reduceSetFilter, reduceSetFilterOptions } from "../models/paged_items_reducers";
import { DEFAULT_PAGINATION_LIMIT } from "../config";
import { selectPageSize } from "../selectors";

type FreezemanThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => T
type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>

interface PagedItemsActions<T extends FMSTrackedModel> {
    listPage: (pageNumber: number) => FreezemanAsyncThunk<T[]>
    refreshPage: () => FreezemanAsyncThunk<T[]>
    setFilter: (value: FilterValue, description: FilterDescription) => FreezemanAsyncThunk<T[]>
    removeFilter: (description: FilterDescription) => FreezemanAsyncThunk<T[]>
}

// Define a type alias for the list function signature
type ListType = (option: any) => NetworkActionThunk<any>;

// Define an interface for the return value of the PagedItemsFactory function
interface PagedItemsFactoryReturnType<T extends FMSTrackedModel> {
  actions: PagedItemsActions<T>;
  reducer: Reducer<PagedItems<T>, AnyAction>;
}

export function PagedItemsFactory<T extends FMSTrackedModel>(prefix: string, list: ListType): PagedItemsFactoryReturnType<T> {
    const LIST_PAGE = createNetworkActionTypes(`${prefix}.LIST_PAGE`)
    const SET_FILTER = `${prefix}.SET_FILTER`
    const SET_FILTER_OPTIONS = `${prefix}.SET_FILTER_OPTIONS`
    const REMOVE_FILTER = `${prefix}.REMOVE_FILTER`
    const CLEAR_FILTER = `${prefix}.CLEAR_FILTER`

    const reducer: PagedItemsFactoryReturnType<T>['reducer'] = (oldState, action) => {
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
            case CLEAR_FILTER: {
                return reduceClearFilters(state)
            }
            default: {
                return state
            }
        }
    }

    const listPage: PagedItemsActions<T>['listPage'] = (pageNumber) => async (dispatch, getState) => {
        const state = getState()
        const pagedItems = state[prefix] as PagedItems<T>
        
        const limit = pagedItems.page?.limit ?? selectPageSize(state)
        const offset = limit * (pageNumber - 1)
        const { filters, fixedFilters, sortBy } = pagedItems

        const { results } = await dispatch<Promise<{ results: T[] }>>(networkAction(LIST_PAGE, list({
            offset,
            filters: { ...fixedFilters, ...filters },
            sortBy,
            limit
        })))
        return results
    }

    const refreshPage: PagedItemsActions<T>['refreshPage'] = () => async (dispatch, getState) => {
        return await dispatch(listPage((getState()[prefix] as PagedItems<T>).page?.pageNumber ?? 1))
    }

    const setFilter: PagedItemsActions<T>['setFilter'] = (value, description) => async (dispatch) => {
        dispatch({
            type: SET_FILTER,
            description: description,
            value: value
        })

        return await dispatch(listPage(1))
    }

    const removeFilter: PagedItemsActions<T>['removeFilter'] = (description) => async (dispatch) => {
        dispatch({
            type: REMOVE_FILTER,
            description: description,
        })

        return await dispatch(listPage(1))
    }

    const actions: PagedItemsActions<T> = {
        listPage,
        refreshPage,
        setFilter,
        removeFilter,
    }

    return { actions, reducer }
}