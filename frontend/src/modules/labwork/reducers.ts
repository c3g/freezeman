import { AnyAction } from "redux"
import { LabworkSummary } from "../../models/labwork_summary"
import { FLUSH_LABWORK_SUMMARY, GET_LABWORK_SUMMARY, SET_HIDE_EMPTY_PROTOCOLS } from "./actions"


export interface LabworkSummaryState {
	isFetching: boolean
	summary?: LabworkSummary
	error?: any
	hideEmptyProtocols: boolean
}

export const labworkSummary = (state: LabworkSummaryState = {isFetching: false, hideEmptyProtocols: false}, action: AnyAction) : LabworkSummaryState => {
	switch(action.type) {
		case GET_LABWORK_SUMMARY.REQUEST: {
			return {
				...state,
				isFetching: true
			}
		}

		case GET_LABWORK_SUMMARY.RECEIVE: {
			return {
				...state,
				isFetching: false,
				summary: action.data
			}
		}

		case GET_LABWORK_SUMMARY.ERROR: {
			return {
				...state,
				isFetching: false,
				error: action.error
			}
		}

		case SET_HIDE_EMPTY_PROTOCOLS: {
			return {
				...state,
				hideEmptyProtocols: action.hideEmptyProtocols
			}
		}

		case FLUSH_LABWORK_SUMMARY: {
			return {
				...state,
				summary: undefined,
				isFetching: false,
				error: undefined
			}
		}
	}
	return state
}

