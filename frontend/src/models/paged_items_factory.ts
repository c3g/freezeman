import { AnyAction, Reducer } from "redux"
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/pagedItemsTable/serializeFilterParamsTS"
import { selectPageSize } from "../selectors"
import { AppDispatch, RootState } from "../store"
import { NetworkActionTypes, createNetworkActionTypes } from "../utils/actions"
import { createPagedItems, FilterDescription, FilterOptions, FilterSetting, FilterValue, PagedItems, SortBy } from "./paged_items"
import { FMSResponse } from "../utils/api"
import { FMSPagedResultsReponse, FMSTrackedModel } from "./fms_api_models"
import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { ObjectId } from "./frontend_models"

export type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>


export interface PagedItemsActions {
	listPage: (pageNumber: number) => FreezemanAsyncThunk<void>
	refreshPage: () => FreezemanAsyncThunk<void>
	setFixedFilter: (key: string, filter: FilterSetting) => AnyAction
	setFilter: (value: FilterValue, description: FilterDescription) => FreezemanAsyncThunk<void>
	setFilterOptions: (description: FilterDescription, options: FilterOptions) => FreezemanAsyncThunk<void>
	removeFilter: (description: FilterDescription) => FreezemanAsyncThunk<void>
	clearFilters: () => FreezemanAsyncThunk<void>
    clearFixedFilters: () => FreezemanAsyncThunk<void>
	setSortBy: (sortByList: SortBy[]) => FreezemanAsyncThunk<void>
	setPageSize: (pageSize: number) => FreezemanAsyncThunk<void>
    resetPagedItems: () => FreezemanAsyncThunk<void>
    setStale: (stale: boolean) => FreezemanAsyncThunk<void>
}

export type SetFilterActionType = PagedItemsActions['setFilter']
export type SetFilterOptionsActionType = PagedItemsActions['setFilterOptions']

// Define a type alias for the list function signature
type ListType<T> = (option: any) => (dispatch: AppDispatch, getState: () => RootState) => Promise<FMSResponse<FMSPagedResultsReponse<T>>['data']>;

// The actions need to be able to find the paged items state they operate on, so we
// need a function that returns the PagedItems. Normally this is just a selector,
// but if the paged items is embedded in an index object or other type of collection
// then a custom function will need to be implemented by the component that uses the state.
export type SelectPagedItemsFunc = (state: RootState) => PagedItems

export function createPagedItemsActions<Prefix extends string, M extends FMSTrackedModel>(prefix: Prefix, selectPagedItems: SelectPagedItemsFunc, list: ListType<M>): PagedItemsActions {
    const actions = createPagedItemsSlice(prefix).actions

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
        await dispatch(_fetchPage(pageNumber))
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
        dispatch(actions.listRequest())
        
        const limit = pagedItems.page?.limit ?? selectPageSize(getState())
        const offset = limit * (pageNumber - 1)
        const { filters, fixedFilters, sortByList } = pagedItems

        const serializedFilters = serializeFilterParamsWithDescriptions({ ...fixedFilters, ...filters })
		const ordering = serializeSortByParams(sortByList)

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
            const reply = await dispatch(list(params))
            
            // The paged items reducer just needs the item ID's, not the actual
            // items that were retrieved, so extract the list of ID's from the data.
            const data: ReduceListReceiveType = {
				items: reply.results.map((item) => item.id),
				totalCount: reply.count,
                pageNumber: pageNumber,
                pageSize: limit
			}
            dispatch(actions.listReceive(data))
        } catch(error) {
            dispatch(actions.listError(error))
            return
        }
    }

    const refreshPage: PagedItemsActions['refreshPage'] = () => async (dispatch, getState) => {
        const pagedItems = selectPagedItems(getState())
        return await dispatch(_fetchPage(pagedItems.page?.pageNumber ?? 1))
    }

    const setFixedFilter: PagedItemsActions['setFixedFilter'] = (key: string, filter: FilterSetting) => {
        return actions.setFixedFilter({
            key,
            setting: filter
        })
    }

    const setFilter: PagedItemsActions['setFilter'] = (value, description) => async (dispatch) => {
        dispatch(actions.setFilter({
            key: description.key,
            setting: {
                value,
                description
            }
        }))

        return await dispatch(_fetchPage(1))
    }

    const setFilterOptions: PagedItemsActions['setFilterOptions'] = (description, options) => async (dispatch) => {
        dispatch(actions.setFilterOptions({
            key: description.key,
            options
        }))
        return await dispatch(_fetchPage(1))
    }

    const removeFilter: PagedItemsActions['removeFilter'] = (description) => async (dispatch) => {
        dispatch(description.key)
        return await dispatch(_fetchPage(1))
    }

    const clearFilters: PagedItemsActions['clearFilters'] = () => async (dispatch) => {
        dispatch(actions.clearFilters())
        return await dispatch(_fetchPage(1))
    }

    const clearFixedFilters: PagedItemsActions['clearFixedFilters'] = () => async (dispatch) => {
        dispatch(actions.clearFixedFilters())
        return await dispatch(_fetchPage(1))
    }

    const setSortBy: PagedItemsActions['setSortBy'] = (sortByList) => async (dispatch) => {
        dispatch(actions.setSortBy(sortByList))

        return await dispatch(_fetchPage(1))
    }

    const setPageSize: PagedItemsActions['setPageSize'] = (pageSize) => async (dispatch) => {
        dispatch(actions.setPageSize(pageSize))
        return await dispatch(_fetchPage(1))
    }

    const resetPagedItems: PagedItemsActions['resetPagedItems'] = () => async (dispatch) => {
        dispatch(actions.reset())
    }

    const setStale: PagedItemsActions['setStale'] = (stale) => async (dispatch) => {
        dispatch(actions.setStale(stale))
    }

    return {
        listPage,
        refreshPage,
        setFixedFilter,
        setFilter,
        setFilterOptions,
        removeFilter,
        clearFilters,
        clearFixedFilters,
        setSortBy,
        setPageSize,
        resetPagedItems,
        setStale
    }
}

export function createPagedItemsReducer<Prefix extends string>(prefix: Prefix) {
    const slice = createPagedItemsSlice(prefix)
    return slice.reducer
}

export function createPagedItemsSlice<Prefix extends string>(prefix: Prefix) {
    const slice = createSlice({
        name: prefix,
        initialState: createPagedItems(),
        reducers: {
            listRequest(state) {
                state.isFetching = true
                state.error = undefined
            },
            listReceive(state, action: PayloadAction<ReduceListReceiveType>) {
                state.isFetching = false
                state.error = undefined
                state.items = action.payload.items
                state.totalCount = action.payload.totalCount
                state.page = {
                    pageNumber: action.payload.pageNumber,
                    limit: action.payload.pageSize
                }
            },
            listError(state, action: PayloadAction<any>) {
                state.isFetching = false
                state.error = action.payload
            },
            setFixedFilter(state, action: PayloadAction<{ key: string, setting: FilterSetting }>) {
                const { key, setting: filter } = action.payload
                state.fixedFilters[key] = filter
            },
            setFilter(state, action: PayloadAction<{ key: string, setting: FilterSetting }>) {
                const { key, setting } = action.payload
                state.filters[key] = setting
            },
            setFilterOptions(state, action: PayloadAction<{ key: string, options: FilterOptions }>) {
                const { key, options } = action.payload
                const setting = state.filters[key]
                if (setting) {
                    setting.options = options
                }
            },
            removeFilter(state, action: PayloadAction<string>) {
                delete state.filters[action.payload]
            },
            clearFilters(state) {
                state.filters = {}
            },
            clearFixedFilters(state) {
                state.fixedFilters = {}
            },
            setSortBy(state, action: PayloadAction<SortBy[]>) {
                state.sortByList = action.payload
            },
            setPageSize(state, action: PayloadAction<number>) {
                if (state.page) {
                    state.page.limit = action.payload
                }
            },
            reset(state) {
                const defaultPagedItems = createPagedItems()
                Object.assign(state, defaultPagedItems)
            },
            setStale(state, action: PayloadAction<boolean>) {
                state.stale = action.payload
            }
        }
    })
    return slice
}

type ReduceListReceiveType = {
    items: ObjectId[],
    pageNumber: number,
    pageSize: number,
    totalCount: number
}