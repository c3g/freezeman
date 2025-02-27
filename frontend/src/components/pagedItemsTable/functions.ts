import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sample } from "../../models/frontend_models";
import { FilterValue, FilterDescription } from "../../models/paged_items";
import { list as listSamples } from "../../modules/samples/actions";
import { AppDispatch } from "../../store";
import { PagedItemsActionsCallbacks } from './PagedItemsTable'


export function fetchSamplesByDefaultSelectionAndExceptedIDs(defaultSelection: boolean, exceptedSampleIDs: Array<Sample['id']>, options: any) {
    return async (dispatch: AppDispatch) => {
        if (defaultSelection) {
            const response = await dispatch(listSamples({ ...options, id__not__in: exceptedSampleIDs.join(',') }))
            return response.results
        } else {
            const response = await dispatch(listSamples({ ...options, id__in: exceptedSampleIDs.join(',') }))
            return response.results
        }
    }
}