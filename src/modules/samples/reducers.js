import { merge, set } from "object-path-immutable";

import preprocessVersions from "../../utils/preprocessVersions";
import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import {templateActionsReducerFactory} from "../../utils/templateActions";

import SAMPLES from "./actions";
import CONTAINERS from "../containers/actions";

export const sampleTemplateActions = templateActionsReducerFactory(SAMPLES);

export const samples = (
    state = {
        itemsByID: {},
        items: [],
        page: { limit: 0, offset: 0 },
        totalCount: 0,
        isFetching: false,
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

        case SAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST.RECEIVE: {
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            const itemsByID = merge(state.itemsByID, [], indexByID(action.data.results));
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
