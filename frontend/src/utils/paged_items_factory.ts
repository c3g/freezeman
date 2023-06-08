import { ThunkAction } from "redux-thunk";
import { FMSTrackedModel } from "../models/fms_api_models";
import { RootState } from "../store";
import { AnyAction, Reducer } from "redux";
import { FilterKeySet, PagedItems, initPagedItems } from "../models/paged_items";
import { SortBy } from "../models/paged_items";
import { createNetworkActionTypes } from "./actions";
import { reduceClearFilters, reduceListError, reduceListReceive, reduceListRequest, reduceRemoveFilter, reduceSetFilter, reduceSetFilterOptions } from "../models/paged_items_reducers";

interface PagedItemsActions<T extends FMSTrackedModel> {
    listPage: (pageNumber: number) => ThunkAction<Promise<T[]>, RootState, unknown, AnyAction>
    setFilters: (filters: FilterKeySet) => ThunkAction<Promise<void>, RootState, unknown, AnyAction>
}

export function PagedItemsFactory<T extends FMSTrackedModel>(baseActionName: string, list: (option: any) => ThunkAction<Promise<T[]>, RootState, unknown, AnyAction>): {
    actions: PagedItemsActions<T>,
    reducer: Reducer<PagedItems<T>, AnyAction>,
} {
    const LIST_PAGE = createNetworkActionTypes(`${baseActionName}.LIST_PAGE`)
    const SET_FILTER = `${baseActionName}.SET_FILTER`
    const SET_FILTER_OPTIONS = `${baseActionName}.SET_FILTER_OPTIONS`
    const REMOVE_FILTER = `${baseActionName}.REMOVE_FILTER`
    const CLEAR_FILTER = `${baseActionName}.CLEAR_FILTER`

    const reducer: Reducer<PagedItems<T>, AnyAction> = (oldState, action) => {
        const state = oldState ?? initPagedItems<T>()
        switch (action.type) {
            case LIST_PAGE.REQUEST: {
                return reduceListRequest(state)
            }
            case LIST_PAGE.RECEIVE: {
                return reduceListReceive(state, action.data)
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
        listPage: (pageNumber) => async (dispatch, getState) => { return [] },
        setFilters: (filters) => async (dispatch, getState) => { return },
    }

    return { actions, reducer }
}