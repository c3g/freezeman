import Containers from "../containers/actions";
import Indices from "../indices/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Groups from "../groups";
import Samples from "../samples/actions";
import Libraries from "../libraries/actions";
import LibraryTypes from "../libraryTypes/actions";
import ProcessMeasurements from "../processMeasurements/actions";
import Projects from "../projects/actions";
import Protocols from "../protocols/actions";
import ExperimentRuns from "../experimentRuns/actions";
import Taxons from "../taxons/actions";
import {refreshAuthToken} from "../auth/actions";
import { createNetworkActionTypes, networkAction } from "../../utils/actions";

export const fetchInitialData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listKinds,
        Containers.summary,
        ExperimentRuns.listInstruments,
        ExperimentRuns.listTypes,
        Indices.summary,
        Samples.listKinds,
        Samples.summary,
        Libraries.summary,
        Projects.summary,
        Protocols.list,
        ProcessMeasurements.summary,
        Users.listTable,
        Groups.list,
        Taxons.list,
    ].map(a => dispatch(a())))

    await Promise.all([
        Containers.listTable,
        ExperimentRuns.listTable,
        Indices.listTable,
        Individuals.listTable,
        Samples.listTable,
        Libraries.listTable,
        Projects.listTable,
        ProcessMeasurements.listTable,
    ].map(a => dispatch(a())))

    // Lower priority
    await Promise.all([
        Containers.listTemplateActions,
        Indices.listTemplateActions,
        Samples.listTemplateActions,
        Libraries.listTemplateActions,
        ProcessMeasurements.listTemplateActions,
        ExperimentRuns.listTemplateActions,
        Projects.listTemplateActions,
        Samples.listPrefillTemplates,
        Libraries.listPrefillTemplates,
        Containers.listPrefillTemplates,
    ].map(a => dispatch(a())))
}

export const fetchSummariesData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.summary,
        Indices.summary,
        Samples.summary,
        Libraries.summary,
        LibraryTypes.list,
        Projects.summary,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
};


export const fetchListedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listTable,
        ExperimentRuns.listTable,
        Indices.listTable,
        Individuals.listTable,
        Samples.listTable,
        Libraries.listTable,
        Projects.listTable,
        ProcessMeasurements.listTable,
        Protocols.list,
    ].map(a => dispatch(a())))

    // Lower priority - Fetch summaries
    await Promise.all([
        Containers.summary,
        Indices.summary,
        Samples.summary,
        Libraries.summary,
        Projects.summary,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
}

export const viewSetActions = (actionNamePrefix, apiKey, stateKey) => {
    actionNamePrefix = actionNamePrefix.toUpperCase();

    const GET    = createNetworkActionTypes(`${actionNamePrefix}.GET`);
    const ADD    = createNetworkActionTypes(`${actionNamePrefix}.ADD`);
    const UPDATE = createNetworkActionTypes(`${actionNamePrefix}.UPDATE`);
    const LIST   = createNetworkActionTypes(`${actionNamePrefix}.LIST`);

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
            UPDATE, apiKey.update(arg), { meta: { id, ignoreError: 'APIError' }}));
    };

    const list = (options) => async (dispatch, getState) => {
        const params = { limit: 100000, ...options }
        return await dispatch(networkAction(LIST,
            apiKey.list(params),
            { meta: params }
        ));
    };

    return {
        GET,
        ADD,
        UPDATE,
        LIST,
        get,
        add,
        update,
        list,
    }
}

export const listAndTableActions = (actionNamePrefix, apiKey, stateKey, FILTERS) => {
    actionNamePrefix = actionNamePrefix.toUpperCase();
    
    const SET_FILTER        = `${actionNamePrefix}.SET_FILTER`;
    const SET_FILTER_OPTION = `${actionNamePrefix}.SET_FILTER_OPTION`;
    const CLEAR_FILTERS     = `${actionNamePrefix}.CLEAR_FILTERS`;
    
    const SET_SORT_BY = `${actionNamePrefix}.SET_SORT_BY`;
    
    const LIST_TABLE  = createNetworkActionTypes(`${actionNamePrefix}.LIST_TABLE`);
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
            data: { name, value}
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

    return {
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
    }
}
