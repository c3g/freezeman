import { FMSId } from "../../models/fms_api_models"
import api from "../../utils/api"
import { get } from "../individuals/actions"
import { list } from "../samples/actions"
import { GET_INDIVIDUAL_DETAILS } from "./reducers"

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

export default {
	getIndividualDetails
}