import { FMSId } from "../../models/fms_api_models"
import { FilterDescription, FilterValue } from "../../models/paged_items"
import { AppDispatch } from "../../store"
import { get } from "../individuals/actions"
import { list } from "../samples/actions"
import { GET_INDIVIDUAL_DETAILS, SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER, CLEAR_FILTERS, REMOVE_INDIVIDUAL_DETAILS_SAMPLES_FILTER } from "./reducers"

export const getIndividualDetails = (individualID: FMSId) => {
	return async (dispatch, getState) => {
		await dispatch({ type: GET_INDIVIDUAL_DETAILS.REQUEST, meta: { individualID } })
		try {
			if (!getState().individuals.itemsByID[individualID]) {
				await dispatch(get(individualID));
			}
			const individual = getState().individuals.itemsByID[individualID]
			const individualSamples = await dispatch(list({ derived_samples__biosample__individual__id__in: individualID, limit: 100000 }))

			await dispatch({ type: GET_INDIVIDUAL_DETAILS.RECEIVE, meta: { individual: individual, individualID, individualSamples: individualSamples.results } })

		} catch (err) {
			dispatch({ type: GET_INDIVIDUAL_DETAILS.ERROR, error: err, meta: { individualID } })
		}
	}
}
export const setIndividualDetailsSamplesFilter = thenList((individualID: FMSId, description: FilterDescription, value: FilterValue) => {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER,
			individualID,
			description,
			value
		})
	}
})
export const removeIndividualDetailsSamplesFilter = thenList((individualID: FMSId, description: FilterDescription) => {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: REMOVE_INDIVIDUAL_DETAILS_SAMPLES_FILTER,
			individualID,
			description,
		})
	}
})
export const clearFilters = thenList((individualID: number) => {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: CLEAR_FILTERS,
			individualID
		})
	}
})

export default {
	getIndividualDetails
}
function thenList(fn) {
	return (...args) => async dispatch => {
		await dispatch(fn(...args))
		await dispatch(list())
	}
}