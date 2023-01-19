import { AnyAction } from "redux"
import { LabworkSummary } from "../../models/labwork_summary"
import { GET_LABWORK_SUMMARY } from "./actions"


export interface LabworkSummaryState {
	isFetching: boolean
	summary?: LabworkSummary
	error?: any
}

export const labworkSummary = (state: LabworkSummaryState = {isFetching: false}, action: AnyAction) : LabworkSummaryState => {
	switch(action.type) {
		case GET_LABWORK_SUMMARY.REQUEST: {
			return {
				...state,
				isFetching: true
			}
		}

		case GET_LABWORK_SUMMARY.RECEIVE: {
			return {
				isFetching: false,
				summary: action.data
			}
		}

		case GET_LABWORK_SUMMARY.ERROR: {
			return {
				isFetching: false,
				error: action.error
			}
		}
	}
	return state
}

