import { Sample } from "../../models/frontend_models";
import { list as listSamples } from "../../modules/samples/actions";
import { AppDispatch } from "../../store";


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