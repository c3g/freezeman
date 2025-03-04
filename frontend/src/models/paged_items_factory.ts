import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../components/pagedItemsTable/serializeFilterParamsTS"
import { selectPageSize } from "../selectors"
import { AppDispatch, RootState } from "../store"
import { createPagedItems, FilterDescription, FilterOptions, FilterSetting, FilterValue, PagedItems, SortBy } from "./paged_items"
import { FMSResponse } from "../utils/api"
import { FMSPagedResultsReponse, FMSTrackedModel } from "./fms_api_models"
import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { ObjectId } from "./frontend_models"

export type FreezemanAsyncThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<T>

export interface PagedItemsActions {
	listPage: (pageNumber: number) => FreezemanAsyncThunk<void>
	refreshPage: () => FreezemanAsyncThunk<void>
	setFilter: (value: FilterValue, description: FilterDescription) => FreezemanAsyncThunk<void>
	setFilterOptions: (description: FilterDescription, options: FilterOptions) => FreezemanAsyncThunk<void>
    setFilterFixed: (description: FilterDescription, fixed: boolean) => FreezemanAsyncThunk<void>
	removeFilter: (description: FilterDescription) => FreezemanAsyncThunk<void>
	clearFilters: () => FreezemanAsyncThunk<void>
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

export function createPagedItemsActions(prefix: string, selectPagedItems: SelectPagedItemsFunc, list: ListType<FMSTrackedModel>): PagedItemsActions {
    const actions = slice.actions
    
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
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })

        const pagedItems = selectPagedItems(getState())

        // Dispatch the LIST_PAGE.REQUEST action
        prefixedDispatch(actions.listRequest())
        
        const limit = pagedItems.page?.limit ?? selectPageSize(getState())
        const offset = limit * (pageNumber - 1)
        const { filters, sortByList } = pagedItems

        const serializedFilters = serializeFilterParamsWithDescriptions({ ...filters })
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
            prefixedDispatch(actions.listReceive(data))
        } catch(error) {
            prefixedDispatch(actions.listError(error))
            return
        }
    }

    const refreshPage: PagedItemsActions['refreshPage'] = () => async (dispatch, getState) => {
        const pagedItems = selectPagedItems(getState())
        return await dispatch(_fetchPage(pagedItems.page?.pageNumber ?? 1))
    }

    const setFilter: PagedItemsActions['setFilter'] = (value, description) => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.setFilter({
            key: description.key,
            setting: {
                value,
                description,
                fixed: false
            }
        }))

        return await dispatch(_fetchPage(1))
    }

    const setFilterOptions: PagedItemsActions['setFilterOptions'] = ({ key }, options) => async (dispatch, getState) => {
        const setting = selectPagedItems(getState()).filters[key]
        if (setting) {
            const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
            prefixedDispatch(actions.setFilter({
                key: key,
                setting: {
                    ...setting,
                    options
                }
            }))
        }
        return await dispatch(_fetchPage(1))
    }

    const setFilterFixed: PagedItemsActions['setFilterFixed'] = ({ key }, fixed) => async (dispatch, getState) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        const setting = selectPagedItems(getState()).filters[key]
        if (setting) {
            prefixedDispatch(actions.setFilterFixed({ key, fixed }))
        }
    }

    const removeFilter: PagedItemsActions['removeFilter'] = ({ key }) => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.removeFilter(key))
        return await dispatch(_fetchPage(1))
    }

    const clearFilters: PagedItemsActions['clearFilters'] = () => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.clearFilters())
        return await dispatch(_fetchPage(1))
    }

    const setSortBy: PagedItemsActions['setSortBy'] = (sortByList) => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.setSortBy(sortByList))

        return await dispatch(_fetchPage(1))
    }

    const setPageSize: PagedItemsActions['setPageSize'] = (pageSize) => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.setPageSize(pageSize))
        return await dispatch(_fetchPage(1))
    }

    const resetPagedItems: PagedItemsActions['resetPagedItems'] = () => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.reset())
    }

    const setStale: PagedItemsActions['setStale'] = (stale) => async (dispatch) => {
        const prefixedDispatch: typeof dispatch = (action) => dispatch({ ...action, type: `${prefix}/${action.type}` })
        prefixedDispatch(actions.setStale(stale))
    }

    return {
        listPage,
        refreshPage,
        setFilter,
        setFilterOptions,
        setFilterFixed,
        removeFilter,
        clearFilters,
        setSortBy,
        setPageSize,
        resetPagedItems,
        setStale
    }
}

export function createPagedItemsReducer(prefix: string, initialState?: PagedItems) {
    const reducer = slice.reducer
    const prefixedReducer: typeof reducer = (state, action) => {
        const prefixWithSlash = `${prefix}/`
        if (action.type.startsWith(prefixWithSlash)) {
            const localAction: typeof action = { ...action, type: action.type.slice(prefixWithSlash.length) }
            return reducer(state, localAction)
        }
        return state ?? initialState ?? createPagedItems()
    }
    return prefixedReducer
}

const slice = createSlice({
    name: 'PagedItems',
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
        setFilter(state, action: PayloadAction<{ key: string, setting: FilterSetting }>) {
            const { key, setting } = action.payload
            if (state.filters[key]?.fixed !== true) {
                state.filters[key] = setting
            }
        },
        setFilterFixed(state, action: PayloadAction<{ key: string, fixed: boolean }>) {
            const { key, fixed } = action.payload
            const setting = state.filters[key]
            if (setting) {
                setting.fixed = fixed
            }
        },
        removeFilter(state, action: PayloadAction<string>) {
            delete state.filters[action.payload]
        },
        clearFilters(state) {
            state.filters = {}
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

type ReduceListReceiveType = {
    items: ObjectId[],
    pageNumber: number,
    pageSize: number,
    totalCount: number
}