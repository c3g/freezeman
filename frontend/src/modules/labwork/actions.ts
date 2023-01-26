import { processFMSLabworkSummary } from '../../models/labwork_summary'
import { selectLabworkSummaryState } from '../../selectors'
import { createNetworkActionTypes } from '../../utils/actions'
import api from '../../utils/api'

export const GET_LABWORK_SUMMARY = createNetworkActionTypes('SAMPLE-NEXT-STEP.GET_LABWORK_SUMMARY')


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

export default {
	GET_LABWORK_SUMMARY,
	getLabworkSummary,
}
