import serializeFilterParamsWithDescriptions from "../../components/shared/WorkflowSamplesTable/serializeFilterParamsTS"
import { FMSId } from "../../models/fms_api_models"
import { FilterDescription, FilterValue } from "../../models/paged_items"
import { AppDispatch } from "../../store"
import { networkAction } from "../../utils/actions"
import api from "../../utils/api"
import { get } from "../individuals/actions"
import { SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER, CLEAR_FILTERS, LIST_TABLE } from "./reducers"

export const getIndividualDetails = (individualID: FMSId) => {
	return async (dispatch, getState) => {
		if (!getState().individuals.itemsByID[individualID]) {
			await dispatch(get(individualID));
		}
		const individual = getState().individuals.itemsByID[individualID]
		await dispatch(networkAction(LIST_TABLE, api.samples.list({ derived_samples__biosample__individual__id__in: individualID }), { meta: { individual, individualID } }))
	}
}


export const setIndividualDetailsSamplesFilter = thenList((individualID: FMSId, description: FilterDescription, value: FilterValue) => {
	return async (dispatch, getState) => {
		dispatch({
			type: SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER,
			individualID,
			description,
			value
		})
		if (!getState().individuals.itemsByID[individualID]) {
			await dispatch(get(individualID));
		}
		const individual = getState().individuals.itemsByID[individualID]
		const serializedFilters = serializeFilterParamsWithDescriptions(individual.filters)
		await dispatch(networkAction(LIST_TABLE, api.samples.list({ ...serializedFilters }), { meta: { individualID } }))
	}
})

export const clearFilters = thenList((individualID: FMSId) => {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: CLEAR_FILTERS,
			individualID
		})
		// dispatch(refreshSamplesByIndividual(individualID))
	}
})


export default {
	getIndividualDetails
}
function thenList(fn) {
	return (...args) => async dispatch => {
		await dispatch(fn(...args))
		// await dispatch(list())
	}
}