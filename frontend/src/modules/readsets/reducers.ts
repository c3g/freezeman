
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
        case READSETS.UPDATE.REQUEST:
            return { ...state, isFetching: true, };
        case READSETS.UPDATE.RECEIVE: {
            console.log("update",action)
            return { ...state, isFetching: false };
        }
        case READSETS.UPDATE.ERROR:
            return { ...state, isFetching: false, error: action.error, };
        case READSETS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case READSETS.LIST.RECEIVE: {
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
        case READSETS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
    }
    return state;
}