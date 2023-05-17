import { FMSId } from "../../models/fms_api_models"
import api from "../../utils/api"
import { GET_INDIVIDUAL_DETAILS } from "./reducers"

export const getIndividualDetails = (individualID: FMSId) => {
	return async (dispatch, getState) => {
		await dispatch({ type: GET_INDIVIDUAL_DETAILS.REQUEST, meta: { individualID } })
		try {
			let individual = getState().individuals.itemsByID[individualID];
			if (!individual)
				individual = await dispatch(api.individuals.get(individualID), { meta: { individualID } });
			const individualSamples = await dispatch(api.samples.list({ derived_samples__biosample__individual__id__in: individualID, limit: 100000 }))
			if (individualSamples && individual) {
				await dispatch({ type: GET_INDIVIDUAL_DETAILS.RECEIVE, meta: { individual: individual, individualID, individualSamples: individualSamples.data } })
			}
		} catch (err) {
			dispatch({ type: GET_INDIVIDUAL_DETAILS.ERROR, error: err, meta: { individualID } })
		}
	}
}

export default {
	getIndividualDetails
}