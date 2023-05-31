import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/shared/WorkflowSamplesTable/serializeFilterParamsTS"
import { FMSId } from "../../models/fms_api_models"
import { FilterDescription, FilterValue, SortBy } from "../../models/paged_items"
import { AppDispatch } from "../../store"
import { networkAction } from "../../utils/actions"
import api from "../../utils/api"
import { get } from "../individuals/actions"
import { SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER, CLEAR_FILTERS, LIST_TABLE, SET_SORT_BY } from "./reducers"


export const setFilter = (individualID: FMSId, description: FilterDescription, value: FilterValue) => {
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

export const setSortBy = (individualID: FMSId, sortBy: SortBy) => {
	return (dispatch) => {
		dispatch({
			type: SET_SORT_BY,
			individualID,
			sortBy
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
		const ordering = serializeSortByParams(getState().individualDetails[individualID]?.data?.samplesByIndividual.sortBy ?? {})
		const filters = serializeFilterParamsWithDescriptions(getState().individualDetails[individualID]?.data?.samplesByIndividual.filters ?? {})
		const options = { derived_samples__biosample__individual__id__in: individualID, ordering, ...filters }
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
