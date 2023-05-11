import { selectLabworkSummaryState, selectWorkflowsByID } from '../../selectors'
import { createNetworkActionTypes } from '../../utils/actions'
import api from '../../utils/api'
import { refreshSamplesAtStep } from '../labworkSteps/actions'
import { findChangedStepsInSummary, processFMSLabworkSummary } from './services'

export const GET_LABWORK_SUMMARY = createNetworkActionTypes('SAMPLE-NEXT-STEP.GET_LABWORK_SUMMARY')
export const SET_HIDE_EMPTY_PROTOCOLS = 'SAMPLE-NEXT-STEP.SET_HIDE_EMPTY_PROTOCOLS'
export const FLUSH_LABWORK_SUMMARY = 'SAMPLE-NEXT-STEP.FLUSH_LABWORK_SUMMARY'

export const getLabworkSummary = () => async (dispatch, getState) => {
	const summary = selectLabworkSummaryState(getState())
	if (summary && summary.isFetching) {
		return
	}

	dispatch({ type: GET_LABWORK_SUMMARY.REQUEST })

	const workflows = Object.values(selectWorkflowsByID(getState()))

	try {
		const response = await dispatch(api.sampleNextStep.labworkSummary())
		const summary = processFMSLabworkSummary(response.data.results, workflows)
		dispatch({
			type: GET_LABWORK_SUMMARY.RECEIVE,
			data: summary
		})
	} catch (err) {
		dispatch({
			type: GET_LABWORK_SUMMARY.ERROR,
			error: err
		})
	}
}

/**
 * Refresh the labwork summary state.
 * @returns  Promise<void>
 */
export const refreshLabworkSummary = () => {
	// Right now, there is no difference between getting the initial labwork
	// summary and refreshing the summary. This action exists in case we need
	// a different behaviour for refreshing in the future.
	return getLabworkSummary()
}

/**
 * Refresh the labwork summary _and_ any step samples state for steps that have changed sample count.
 * @returns Promise<void>
 */
export const refreshLabwork = () => {
	// Right now, there is no difference between getting the initial labwork
	// summary and refreshing the summary. This action exists in case we need
	// a different behaviour for refreshing in the future.
	return async (dispatch, getState) => {
		let labworkChanged = false
		const oldState = selectLabworkSummaryState(getState())

		await dispatch(refreshLabworkSummary())

		const newState = selectLabworkSummaryState(getState())

		// If the state actually changed the check to see if any step counts changed.
		if (oldState !== newState && oldState.summary && newState.summary && oldState.summary !== newState.summary) {
			// 
			const changedSteps = findChangedStepsInSummary(oldState.summary, newState.summary)
			if (changedSteps.length > 0) {
				labworkChanged = true
				changedSteps.forEach(stepID => dispatch(refreshSamplesAtStep(stepID)))
			}
		}
		return labworkChanged
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
