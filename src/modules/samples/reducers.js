import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import preprocessVersions from "../../utils/preprocessVersions";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {summaryReducerFactory} from "../../utils/summary";
import {templateActionsReducerFactory} from "../../utils/templateActions";

import CONTAINERS from "../containers/actions";
import SAMPLES from "./actions";

export const samplesSummary = summaryReducerFactory(SAMPLES);
export const sampleTemplateActions = templateActionsReducerFactory(SAMPLES);

export const samples = (
    state = {
        itemsByID: {},
        items: [],
        page: { limit: 0, offset: 0 },
        totalCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case SAMPLES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case SAMPLES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case SAMPLES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case SAMPLES.ADD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case SAMPLES.ADD.RECEIVE:
            return merge({ ...state, isFetching: false, }, ['itemsByID', action.data.id],
                preprocessSample(action.data));
        case SAMPLES.ADD.ERROR:
            return { ...state, error: action.error, isFetching: false };

        case SAMPLES.UPDATE.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case SAMPLES.UPDATE.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
        case SAMPLES.UPDATE.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
                { error: action.error, isFetching: false });

        case SAMPLES.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case SAMPLES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
            };
        case SAMPLES.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case SAMPLES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };

        case SAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST.RECEIVE: {
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            /* samples[].container stored in ../containers/reducers.js */
            const newItemsByID = map(
                s => ({ ...s, container: s.container }),
                indexByID(action.data.results)
            );
            const itemsByID = merge(state.itemsByID, [], newItemsByID);
            const itemsID = action.data.results.map(r => r.id)
            const items = mergeArray(currentItems, action.meta.offset, itemsID)
            return {
                ...state,
                itemsByID,
                items,
                totalCount: action.data.count,
                page: action.meta,
                isFetching: false,
            };
        }
        case SAMPLES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case SAMPLES.LIST_VERSIONS.REQUEST:
            return set(state, ['itemsByID', action.meta.id, 'isFetching'], true);
        case SAMPLES.LIST_VERSIONS.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], {
                isFetching: false,
                versions: preprocessVersions(action.data),
            });
        case SAMPLES.LIST_VERSIONS.ERROR:
            return merge(state, ['itemsByID', action.meta.id], {
                isFetching: false,
                versions: [],
                error: action.error,
            });

        /*
         * NOTE: CONTAINERS.LIST_SAMPLES is handled in samples & containers
         */
        case CONTAINERS.LIST_SAMPLES.REQUEST: {
            const itemsByID = indexByID(
                action.meta.samples.map(id => ({ id, isFetching: true })))
            return merge(state, ['itemsByID'], itemsByID);
        }
        case CONTAINERS.LIST_SAMPLES.RECEIVE: {
            return merge(state, ['itemsByID'], indexByID(action.data.map(preprocessSample)));
        }
        case CONTAINERS.LIST_SAMPLES.ERROR: {
            const itemsByID =
                action.meta.samples
                    .reduce((acc, id) => (acc[id] = undefined, acc), {})
            return merge(state, ['itemsByID'], itemsByID);
        }

        default:
            return state;
    }
};

function preprocessSample(sample) {
    sample.isFetching = false;
    sample.isLoaded = true;
    return sample
}
