import serializeFilterParamsWithDescriptions from "../../components/shared/WorkflowSamplesTable/serializeFilterParamsTS"
import { FMSId } from "../../models/fms_api_models"
import { FilterDescription, FilterValue } from "../../models/paged_items"
import { AppDispatch } from "../../store"
import { networkAction } from "../../utils/actions"
import api from "../../utils/api"
import { get } from "../individuals/actions"
import { SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER, CLEAR_FILTERS, LIST_TABLE, IndividualDetailsState, Individual } from "./reducers"


export const setIndividualDetailsSamplesFilter = (individualID: FMSId, description: FilterDescription, value: FilterValue) => {
	return async (dispatch, getState) => {
		dispatch({
			type: SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER,
			individualID,
			description,
			value
		})

		dispatch(listTable(individualID))
	}
}

export const listTable = (individualID: FMSId) => {
	return async (dispatch, getState) => {
		if (!getState().individuals.itemsByID[individualID]) {
			await dispatch(get(individualID));
		}
		const individual = getState().individuals.itemsByID[individualID]
		const details = getState().individualDetails;
		const filters = serializeFilterParamsWithDescriptions(details[individualID]?.data?.samplesByIndividual.filters ?? {})
		const options = { derived_samples__biosample__individual__id__in: individualID, ...filters }

		return await dispatch(networkAction(LIST_TABLE, api.samples.list(options), { meta: { individualID, individual: individual } }))
	}
}

export const clearFilters = (individualID: FMSId) => {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: CLEAR_FILTERS,
			individualID
		})
		dispatch(listTable(individualID))
	}
}
