import {merge, set} from "object-path-immutable"
import {map} from "rambda"

import {indexByID} from "../../utils/objects"
import mergeArray from "../../utils/mergeArray"

import POOLED_SAMPLES from "./actions";
import { emailRules } from "../../constants";


const EMPTY_STATE = {
    itemsByID: {},
    items: [],
    page: { limit: 0, offset: 0 },
    totalCount: 0,
    isFetching: false,
    filters: {},
    fixedFilters: {},
    sortBy: { key: undefined, order: undefined },
}

export const pooledSamples = (
    state = EMPTY_STATE,
    action
) => {
    switch (action.type) {
        case POOLED_SAMPLES.SET_FIXED_FILTER:
            // A fixed filter is a filter that gets set by a component when it is created and
            // which is included with every listTable request.
            return {
                ...state,
                fixedFilters: set(state.fixedFilters, [action.data.name, 'value'], action.data.value)
            }
        case POOLED_SAMPLES.SET_SORT_BY:
            return { ...state, sortBy: action.data, items: [], totalCount: 0 };
        case POOLED_SAMPLES.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            };
        case POOLED_SAMPLES.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            }
        case POOLED_SAMPLES.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                items: [],
                totalCount: 0,
                page: set(state.page, ['offset'], 0),
            }

        case POOLED_SAMPLES.LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case POOLED_SAMPLES.LIST_TABLE.RECEIVE: {
            const totalCount = action.data.count;
            //If filter was changed we get a new list with a different count
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            const results = action.data.results.map(preprocess)
            //New filtered items
            const newItems = action.data.results.map(r => r.id)
            const items = mergeArray(currentItems, action.meta.offset, newItems)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return {
              ...state,
              itemsByID,
              items,
              totalCount,
              isFetching: false,
              error: undefined
            };
        }
        case POOLED_SAMPLES.LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, }

        case POOLED_SAMPLES.FLUSH_STATE:
            return EMPTY_STATE

        default:
            return state;
    }
}

function preprocess(pooledSample) {
    pooledSample.isFetching = false
    pooledSample.isLoaded = true

    // Flatten the data structure for the UX
   return flattenSample(pooledSample)
}

/**
 * Convert the nested data structure returned by the pool sample api to a flat
 * list of properties for the UX.
 * @param {*} pooledSample 
 * @returns 
 */
function flattenSample(pooledSample) {
    return {
        id: pooledSample.id,
        alias: pooledSample.derived_sample.biosample?.alias,
        volume_ratio: pooledSample.volume_ratio,
        project: undefined,     // TODO project isn't available on derived sample yet
        index_set: pooledSample.derived_sample.library?.index?.index_set,
        index: pooledSample.derived_sample.library?.index?.name
    }
}

/* Example of sample data returned.
{
    "id": 392696,
    "volume_ratio": "0.500",
    "derived_sample": {
        "id": 392696,
        "library": {
            "id": 6,
            "library_type": "PCR-free",
            "platform": "ILLUMINA",
            "index": {
                "id": 13133,
                "index_set": "IDT_10nt_UDI_TruSeq_Adapter",
                "index_structure": "TruSeqHT",
                "name": "IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002",
                "sequences_3prime": [
                    7094
                ],
                "sequences_5prime": [
                    7093
                ]
            },
            "library_size": "100",
            "strandedness": "Double stranded"
        },
        "biosample": {
            "id": 296342,
            "alias": null,
            "collection_site": "MUHC",
            "individual": 189385
        },
        "tissue_source": {
            "name": "BLOOD",
            "is_extracted": false
        },
        "sample_kind": {
            "name": "DNA",
            "is_extracted": true
        },
        "experimental_group": []
    },
}
*/
