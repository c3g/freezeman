
import { Readset } from "../../models/frontend_models";
import { indexByID } from "../../utils/objects";
import READSETS from "./actions"
import { merge } from "object-path-immutable"

export const readsets = (
    state = {
        itemsByID: {},
        items: [],
        isFetching: false,
    }
    ,
    action) => {
    switch (action.type) {
        case READSETS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case READSETS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case READSETS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
                { error: action.error, isFetching: false, didFail: true });
        case READSETS.SET_RELEASE_STATUS.REQUEST:
            return { ...state, isFetching: true, };
        case READSETS.SET_RELEASE_STATUS.RECEIVE: {
            return { ...state, isFetching: false };
        }
        case READSETS.SET_RELEASE_STATUS.ERROR:
            return { ...state, isFetching: false, error: action.error, };
        case READSETS.LIST_WITH_METRICS.REQUEST:
            return { ...state, isFetching: true, };
        case READSETS.LIST_WITH_METRICS.RECEIVE: {
            let list: Readset[] = []
            action.data.results.forEach(readset => {
                if (readset.metrics && Array.isArray(readset.metrics)) {
                    const keyedMetrics = {}
                    readset.metrics.forEach(metric => {
                        keyedMetrics[metric.name] = metric
                    })
                    readset.metrics = keyedMetrics
                    list.push(readset)
                }
            })
            const itemsByID = merge(state.itemsByID, [], indexByID(list));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case READSETS.LIST_WITH_METRICS.ERROR:
            return { ...state, isFetching: false, error: action.error, };
        case READSETS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case READSETS.LIST.RECEIVE: {
            const itemsByID = merge(state.itemsByID, [], indexByID(action.data.results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case READSETS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
    }
    return state;
}