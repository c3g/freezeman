import { merge, set } from "object-path-immutable";

import { indexByID } from "../../utils/objects";
import { prefillTemplatesReducerFactory } from "../../utils/prefillTemplates";
import { preprocessSampleVersions } from "../../utils/preprocessRevisions";
import { resetTable } from "../../utils/reducers";
import { summaryReducerFactory } from "../../utils/summary";
import { templateActionsReducerFactory } from "../../utils/templateActions";

import SAMPLES from "./actions";
import { ItemsByID, Sample } from "../../models/frontend_models"
import { AnyAction } from "redux"

export const sampleKinds = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case SAMPLES.LIST_KINDS.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case SAMPLES.LIST_KINDS.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case SAMPLES.LIST_KINDS.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};

export const samplesSummary = summaryReducerFactory(SAMPLES);
export const sampleTemplateActions = templateActionsReducerFactory(SAMPLES);
export const samplePrefillTemplates = prefillTemplatesReducerFactory(SAMPLES);

export interface SamplesState {
    itemsByID: ItemsByID<Sample>
    isFetching: boolean
    error?: any
}

const initialState : SamplesState = {
    itemsByID: {},
    isFetching: false,
}

export const samples = (
    state : SamplesState = initialState,
    action: AnyAction
): SamplesState => {
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
            return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
                preprocess(action.data));
        case SAMPLES.ADD.ERROR:
            return { ...state, error: action.error, isFetching: false };

        case SAMPLES.UPDATE.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case SAMPLES.UPDATE.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
        case SAMPLES.UPDATE.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
                { error: action.error, isFetching: false });

        case SAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case SAMPLES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case SAMPLES.LIST_VERSIONS.REQUEST:
            return set(state, ['itemsByID', action.meta.id, 'isFetching'], true);
        case SAMPLES.LIST_VERSIONS.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], {
                isFetching: false,
                versions: preprocessSampleVersions(action.data),
            });
        case SAMPLES.LIST_VERSIONS.ERROR:
            return merge(state, ['itemsByID', action.meta.id], {
                isFetching: false,
                versions: [],
                error: action.error,
            });

        default:
            return state;
    }
};

function preprocess(sample) {
    sample.isFetching = false;
    sample.isLoaded = true;
    return sample
}
