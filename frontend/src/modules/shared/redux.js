export const viewSetRedux = (actionNamePrefix, apiKey, stateKey) => {
    actionNamePrefix = actionNamePrefix.toUpperCase();

    const GET = createNetworkActionTypes(`${actionNamePrefix}.GET`);
    const ADD = createNetworkActionTypes(`${actionNamePrefix}.ADD`);
    const UPDATE = createNetworkActionTypes(`${actionNamePrefix}.UPDATE`);
    const LIST = createNetworkActionTypes(`${actionNamePrefix}.LIST`);

    const get = id => async (dispatch, getState) => {
        const item = getState()[stateKey].itemsByID[id];
        if (item && item.isFetching)
            return;

        return await dispatch(networkAction(GET, api[apiKey].get(id), { meta: { id } }));
    };

    const add = arg => async (dispatch, getState) => {
        if (getState()[stateKey].isFetching)
            return;

        return await dispatch(networkAction(
            ADD, apiKey.add(arg), { meta: { ignoreError: 'APIError' } }));
    };

    const update = (id, arg) => async (dispatch, getState) => {
        if (getState()[stateKey].itemsByID[id].isFetching)
            return;

        return await dispatch(networkAction(
            UPDATE, apiKey.update(arg), { meta: { id, ignoreError: 'APIError' } }));
    };

    const list = (options) => async (dispatch, getState) => {
        const params = { limit: 100000, ...options }
        return await dispatch(networkAction(LIST,
            apiKey.list(params),
            { meta: params }
        ));
    };

    const reducer = (state = {
        itemsByID: {},
        items: [],
        isFetching: false,
    }, action) => {
        switch (action.type) {
            case GET.REQUEST:
                return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
            case GET.RECEIVE:
                return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
            case GET.ERROR:
                return merge(state, ['itemsByID', action.meta.id],
                    { error: action.error, isFetching: false, didFail: true });

            case ADD.REQUEST:
                return { ...state, error: undefined, isFetching: true };
            case ADD.RECEIVE:
                return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
                    preprocess(action.data));
            case ADD.ERROR:
                return { ...state, error: action.error, isFetching: false };

            case UPDATE.REQUEST:
                return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
            case UPDATE.RECEIVE:
                return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
            case UPDATE.ERROR:
                return merge(state, ['itemsByID', action.meta.id],
                    { error: action.error, isFetching: false });

            case LIST.REQUEST:
                return { ...state, isFetching: true, };
            case LIST.RECEIVE: {
                const results = action.data.results.map(preprocess)
                const itemsByID = merge(state.itemsByID, [], indexByID(results));
                return { ...state, itemsByID, isFetching: false, error: undefined };
            }
            case LIST.ERROR:
                return { ...state, isFetching: false, error: action.error, };

            default:
                return state;
        }
    }

    return {
        actions: {
            GET,
            ADD,
            UPDATE,
            LIST,
            get,
            add,
            update,
            list,
        },
        reducer
    }
}

export const listAndTableRedux = (actionNamePrefix, apiKey, stateKey, FILTERS) => {
    actionNamePrefix = actionNamePrefix.toUpperCase();

    const SET_FILTER = `${actionNamePrefix}.SET_FILTER`;
    const SET_FILTER_OPTION = `${actionNamePrefix}.SET_FILTER_OPTION`;
    const CLEAR_FILTERS = `${actionNamePrefix}.CLEAR_FILTERS`;

    const SET_SORT_BY = `${actionNamePrefix}.SET_SORT_BY`;

    const LIST_TABLE = createNetworkActionTypes(`${actionNamePrefix}.LIST_TABLE`);
    const LIST_FILTER = createNetworkActionTypes(`${actionNamePrefix}.LIST_FILTER`);

    const listFilter = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT, filters = {}, sortBy }, abort) => async (dispatch, getState) => {
        if (getState()[stateKey].isFetching && !abort)
            return

        limit = getState().pagination.pageSize;
        filters = serializeFilterParams(filters, FILTERS)
        const ordering = serializeSortByParams(sortBy)
        const options = { limit, offset, ordering, ...filters }

        return await dispatch(networkAction(LIST_FILTER,
            api[apiKey].list(options, abort),
            { meta: { ...options } }
        ));
    };

    const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
        const items = getState()[stateKey]
        if (items.isFetching && !abort)
            return

        const limit = getState().pagination.pageSize;
        const filters = serializeFilterParams(items.filters, FILTERS)
        const ordering = serializeSortByParams(items.sortBy)
        const options = { limit, offset, ordering, ...filters }

        return await dispatch(networkAction(LIST_TABLE,
            api[apiKey].list(options, abort),
            { meta: { ...options, ignoreError: 'AbortError' } }
        ));
    };

    const setSortBy = thenList((key, order) => {
        return {
            type: SET_SORT_BY,
            data: { key, order }
        }
    });

    const setFilter = thenList((name, value) => {
        return {
            type: SET_FILTER,
            data: { name, value }
        }
    });

    const setFilterOption = thenList((name, option, value) => {
        return {
            type: SET_FILTER_OPTION,
            data: { name, option, value }
        }
    });

    const clearFilters = thenList(() => {
        return {
            type: CLEAR_FILTERS,
        }
    });

    const reducer = (state = {
        filteredItems: [],
        page: { offset: 0 },
        totalCount: 0,
        filteredItemsCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    }, action) => {
        switch (action.type) {
            case SET_SORT_BY:
                return { ...state, sortBy: action.data, items: [] };

            case SET_FILTER:
                return {
                    ...state,
                    filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                    items: [],
                    page: set(state.page, ['offset'], 0),
                };
            case SET_FILTER_OPTION:
                return {
                    ...state,
                    filters: set(
                        state.filters,
                        [action.data.name, 'options', action.data.option],
                        action.data.value
                    ),
                    items: [],
                    page: set(state.page, ['offset'], 0),
                };
            case CLEAR_FILTERS:
                return {
                    ...state,
                    filters: {},
                    items: [],
                    page: set(state.page, ['offset'], 0),
                };

            case LIST_FILTER.REQUEST:
                return { ...state, isFetching: true, };
            case LIST_FILTER.RECEIVE: {
                const filteredItemsCount = action.data.count;
                //If filter was changed we get a new list with a different count
                const hasChanged = state.filteredItemsCount !== action.data.count;
                const currentItems = hasChanged ? [] : state.filteredItems;
                const results = action.data.results.map(preprocess)
                //New filtered items
                const newFilteredItems = action.data.results.map(r => r.id)
                const filteredItems = mergeArray(currentItems, action.meta.offset, newFilteredItems)
                const itemsByID = merge(state.itemsByID, [], indexByID(results));
                return {
                    ...state,
                    itemsByID,
                    filteredItems,
                    filteredItemsCount,
                    isFetching: false,
                    error: undefined
                };
            }
            case LIST_FILTER.ERROR:
                return { ...state, isFetching: false, error: action.error, };

            case LIST_TABLE.REQUEST:
                return { ...state, isFetching: true, };
            case LIST_TABLE.RECEIVE: {
                const totalCount = action.data.count;
                const hasChanged = state.totalCount !== action.data.count;
                const currentItems = hasChanged ? [] : state.items;
                const results = action.data.results.map(preprocess)
                const newItemsByID = map(
                    s => ({ ...s, container: s.container }),
                    indexByID(results)
                );
                const itemsByID = merge(state.itemsByID, [], newItemsByID);
                const itemsID = action.data.results.map(r => r.id)
                const items = mergeArray(currentItems, action.meta.offset, itemsID)
                return {
                    ...state,
                    itemsByID,
                    items,
                    totalCount,
                    page: action.meta,
                    isFetching: false,
                    error: undefined,
                };
            }
            case LIST_TABLE.ERROR:
                return { ...state, isFetching: false, error: action.error, };

            default:
                return state;
        }
    }

    return {
        actions: {
            SET_FILTER,
            SET_FILTER_OPTION,
            CLEAR_FILTERS,
            SET_SORT_BY,
            LIST_TABLE,
            LIST_FILTER,
            setFilter,
            setFilterOption,
            clearFilters,
            setSortBy,
            listTable,
            listFilter,
        },
        reducer
    }
}
