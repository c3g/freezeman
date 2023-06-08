import { ThunkAction } from "redux-thunk";
import { FMSTrackedModel } from "../models/fms_api_models";
import { AppDispatch, RootState } from "../store";
import { AnyAction, Reducer } from "redux";
import { FilterKeySet, PagedItems, initPagedItems } from "../models/paged_items";
import { SortBy } from "../models/paged_items";
import { createNetworkActionTypes, networkAction } from "./actions";
import { ReduceListReceiveType, reduceClearFilters, reduceListError, reduceListReceive, reduceListRequest, reduceRemoveFilter, reduceSetFilter, reduceSetFilterOptions } from "../models/paged_items_reducers";
import { DEFAULT_PAGINATION_LIMIT } from "../config";

type FreezemanThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => T
type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>

interface PagedItemsActions<T extends FMSTrackedModel> {
    listPage: (pageNumber: number) => FreezemanAsyncThunk<T[]>
    setFilters: (filters: FilterKeySet) => FreezemanThunk<void>
}

export function PagedItemsFactory<T extends FMSTrackedModel>(ID: string, list: (option: any) => ThunkAction<Promise<any>, RootState, unknown, AnyAction>): {
    actions: PagedItemsActions<T>,
    reducer: Reducer<PagedItems<T>, AnyAction>,
} {
    const LIST_PAGE = createNetworkActionTypes(`${ID}.LIST_PAGE`)
    const SET_FILTER = `${ID}.SET_FILTER`
    const SET_FILTER_OPTIONS = `${ID}.SET_FILTER_OPTIONS`
    const REMOVE_FILTER = `${ID}.REMOVE_FILTER`
    const CLEAR_FILTER = `${ID}.CLEAR_FILTER`

    const reducer: Reducer<PagedItems<T>, AnyAction> = (oldState, action) => {
        const state = oldState ?? initPagedItems<T>()
        switch (action.type) {
            case LIST_PAGE.REQUEST: {
                return reduceListRequest(state)
            }
            case LIST_PAGE.RECEIVE: {
                const data = action.data.results as ReduceListReceiveType<T>
                return reduceListReceive(state, data)
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

    const actions: PagedItemsActions<T> = {
        listPage: (pageNumber) => async (dispatch, getState) => {
            const pagedItems = getState()[ID] as PagedItems<T>
            
            const limit = pagedItems.page?.limit ?? DEFAULT_PAGINATION_LIMIT
            const offset = limit * pageNumber
            const filters = pagedItems.filters
            const sortBy = pagedItems.sortBy

            return dispatch(networkAction(LIST_PAGE, list({ offset, filters, sortBy, limit })))
        },
        setFilters: (filters) => (dispatch, getState) => { return },
    }

    return { actions, reducer }
}