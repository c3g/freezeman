import { FLUSH } from 'redux-persist'
import { processFMSLabworkSummary } from '../../models/labwork_summary'
import { selectLabworkSummaryState } from '../../selectors'
import { createNetworkActionTypes } from '../../utils/actions'
import api from '../../utils/api'

export const GET_LABWORK_SUMMARY = createNetworkActionTypes('SAMPLE-NEXT-STEP.GET_LABWORK_SUMMARY')
export const SET_HIDE_EMPTY_PROTOCOLS = 'SAMPLE-NEXT-STEP.SET_HIDE_EMPTY_PROTOCOLS'
export const FLUSH_LABWORK_SUMMARY = 'SAMPLE-NEXT-STEP.FLUSH_LABWORK_SUMMARY'


export const getLabworkSummary = () => async (dispatch, getState) => {
	const summary = selectLabworkSummaryState(getState())
	if (summary && summary.isFetching) {
		return
	}

	dispatch({type: GET_LABWORK_SUMMARY.REQUEST})

	try {
		const response = await dispatch(api.sampleNextStep.labworkSummary())
		const summary = processFMSLabworkSummary(response.data.results)
		dispatch({
			type: GET_LABWORK_SUMMARY.RECEIVE,
			data: summary
		})
	} catch(err) {
		dispatch({
			type: GET_LABWORK_SUMMARY.ERROR,
			error: err
		})
	}
}

export const setHideEmptyProtocols = (hide: boolean) => {
	return {
		type: SET_HIDE_EMPTY_PROTOCOLS,
		hideEmptyProtocols: hide
	}
}

export const flushLabworkSummary = () => {
	return {
		type: FLUSH_LABWORK_SUMMARY
	}
}

export default {
	GET_LABWORK_SUMMARY,
	SET_HIDE_EMPTY_PROTOCOLS,
	FLUSH_LABWORK_SUMMARY,
	getLabworkSummary,
	setHideEmptyProtocols,
	flushLabworkSummary,
}
