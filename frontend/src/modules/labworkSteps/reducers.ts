import { AnyAction } from 'redux'
import { FMSId } from '../../models/fms_api_models'
import { createItemsByID, SampleNextStep } from '../../models/frontend_models'
import { LabworkStepSamples, LabworkStepsState } from './models'
import { LIST, LIST_TEMPLATE_ACTIONS, INIT_SAMPLES_AT_STEP, FLUSH_SAMPLES_AT_STEP, SET_SELECTED_SAMPLES } from './actions'
import { templateActionsReducerFactory } from '../../utils/templateActions'

const INTIAL_STATE: LabworkStepsState = {
	steps: {},
}

function getStepSamplesByID(state: LabworkStepsState, stepID: FMSId): LabworkStepSamples | undefined {
	let stepSamples = state.steps[stepID]
	if (stepSamples) {
		stepSamples = { ...stepSamples }
	}
	return stepSamples
}

function updateStepSamples(state: LabworkStepsState, step: LabworkStepSamples) {
	const { stepID } = step
	return {
		...state,
		steps: {
			...state.steps,
			[stepID]: step,
		},
	}
}

function handleListRequest(state: LabworkStepsState, stepID: FMSId): LabworkStepsState {
	let stepSamples: LabworkStepSamples = state.steps[stepID]
	if (stepSamples) {
		stepSamples = {
			...stepSamples,
			pagedItems: {
				...stepSamples.pagedItems,
				isFetching: true,
				error: undefined,
			},
		}
		state = updateStepSamples(state, stepSamples)
	} 
	return state
}

function handleListReceive(
	state: LabworkStepsState,
	stepID: FMSId,
	pageNumber: number,
	totalCount: number,
	sampleNextSteps: SampleNextStep[]
) {
	let stepSamples: LabworkStepSamples = state.steps[stepID]
	if (stepSamples) {
		stepSamples = {
			...stepSamples,
			pagedItems: {
				...stepSamples.pagedItems,
				isFetching: false,
				error: undefined,
				totalCount,
				items: sampleNextSteps.map((sampleNextStep) => sampleNextStep.id),
				itemsByID: {
					...stepSamples.pagedItems.itemsByID,
					...createItemsByID(sampleNextSteps),
				},
				page: {
					...stepSamples.pagedItems.page,
					pageNumber,
				},
			},
		}

		// Update the list of displayed samples
		stepSamples.displayedSamples = sampleNextSteps.map((sampleNextStep) => sampleNextStep.sample)

		state = updateStepSamples(state, stepSamples)
	}
	return state
}

function handleListError(state: LabworkStepsState, stepID: FMSId, error: any) {
	let stepSamples: LabworkStepSamples = state.steps[stepID]
	if (stepSamples) {
		stepSamples = {
			...stepSamples,
			pagedItems: {
				...stepSamples.pagedItems,
				error,
			},
		}
		state = updateStepSamples(state, stepSamples)
	}
	return state
}

export const labworkSteps = (state: LabworkStepsState = INTIAL_STATE, action: AnyAction) => {
	switch (action.type) {
		case INIT_SAMPLES_AT_STEP: {
			const { stepID, templates } = action
			const stepSamples: LabworkStepSamples = {
				stepID,
				pagedItems: {
					isFetching: false,
					error: undefined,
					totalCount: 0,
					items: [],
					itemsByID: {},
					page: {
						pageNumber: 0
					},
					filters: {},
					sortBy: {}
				},
				displayedSamples: [],
				selectedSamples: [],
				prefill: {
					templates
				}
			}
			return updateStepSamples(state, stepSamples)
		}
		case LIST.REQUEST: {
			const { meta } = action
			return handleListRequest(state, meta.stepID)
		}
		case LIST.RECEIVE: {
			const { meta, data } = action
			return handleListReceive(state, meta.stepID, meta.pageNumber, data.count, data.results)
		}
		case LIST.ERROR: {
			const { meta, error } = action
			return handleListError(state, meta.stepID, error)
		}
		case SET_SELECTED_SAMPLES: {
			const { stepID, sampleIDs } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if(!stepSamples) {
				return state
			}
			const newStepSamples : LabworkStepSamples = {
				...stepSamples,
				selectedSamples: sampleIDs
			}
			return updateStepSamples(state, newStepSamples)
		}
		case FLUSH_SAMPLES_AT_STEP: {
			const { stepID } = action
			const newState = {
				...state,
			}
			delete newState[stepID]
			return newState
		}
	}
	return state
}

export const sampleNextStepTemplateActions = templateActionsReducerFactory({LIST_TEMPLATE_ACTIONS})
