import { AnyAction } from 'redux'
import { clearFiltersReducer, setFilterOptionsReducer, setFilterReducer } from '../../components/shared/WorkflowSamplesTable/FilterReducers'
import { FMSId } from '../../models/fms_api_models'
import { createItemsByID, SampleNextStep } from '../../models/frontend_models'
import { templateActionsReducerFactory } from '../../utils/templateActions'
import { LabworkStepSamples, LabworkStepsState } from './models'
import { createNetworkActionTypes } from '../../utils/actions'

export const INIT_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:INIT_SAMPLES_AT_STEP'
export const LIST = createNetworkActionTypes('LABWORK_STEP')
export const SET_SELECTED_SAMPLES = 'SAMPLES_AT_STEP:SET_SELECTED_SAMPLES'
export const FLUSH_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:LOAD_SAMPLES_AT_STEP'
export const SET_FILTER = 'SAMPLES_AT_STEP:SET_FILTER'
export const SET_FILTER_OPTION = 'SAMPLES_AT_STEP:SET_FILTER_OPTION'
export const CLEAR_FILTERS = 'SAMPLES_AT_STEP:CLEAR_FILTERS'
export const SET_SORT_BY = 'SAMPLES_AT_STEP:SET_SORT_BY'
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("SAMPLES_AT_STEP.LIST_TEMPLATE_ACTIONS")
export const SHOW_SELECTION_CHANGED_MESSAGE = 'SAMPLES_AT_STEP:SHOW_SELECTION_CHANGED_MESSAGE'
export const SET_SELECTED_SAMPLES_SORT_DIRECTION = 'SAMPLES_AT_STEP:SET_SELECTED_SAMPLES_SORT_DIRECTION'


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

function adjustPageNumber(currentPageNumber: number, pageSize: number, totalCount: number): number {
	let pageNumber = currentPageNumber
	if(totalCount === 0 || pageSize === 0) {
		pageNumber = 1
	} else {
		const numPages = Math.ceil(totalCount / pageSize)
		if (pageNumber > numPages) {
			pageNumber = numPages
		} 
	}
	return pageNumber
}

function handleListReceive(
	state: LabworkStepsState,
	stepID: FMSId,
	pageNumber: number,
	pageSize: number,
	totalCount: number,
	sampleNextSteps: SampleNextStep[]
) {
	// Adjust page number if the total number of items doesn't reach that page,
	// which can happen if we refresh the list of samples and some samples are no longer
	// at the step.
	pageNumber = adjustPageNumber(pageNumber, pageSize, totalCount)
	
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
					limit: pageSize,
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
				selectedSamplesSortDirection: 'column',
				prefill: {
					templates
				},
				showSelectionChangedWarning: false
			}
			return updateStepSamples(state, stepSamples)
		}
		case LIST.REQUEST: {
			const { meta } = action
			return handleListRequest(state, meta.stepID)
		}
		case LIST.RECEIVE: {
			const { meta, data } = action
			return handleListReceive(state, meta.stepID, meta.pageNumber, meta.limit, data.count, data.results)
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
			delete newState.steps[stepID]
			return newState
		}

		case SET_FILTER: {
			const { stepID, value, description} = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				const filters = setFilterReducer(stepSamples.pagedItems.filters, description, value)
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: {
						...stepSamples.pagedItems,
						filters
					}
				})
			}
			break
		}

		case SET_FILTER_OPTION: {
			const { stepID, options, description } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				const filters = setFilterOptionsReducer(stepSamples.pagedItems.filters, description, options)
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: {
						...stepSamples.pagedItems,
						filters
					}
				})
			}
			break
		}

		case CLEAR_FILTERS: {
			const { stepID } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				const filters = clearFiltersReducer()
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: {
						...stepSamples.pagedItems,
						filters
					}
				})
			}
			break
		}

		case SET_SORT_BY: {
			const { stepID, sortBy } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: {
						...stepSamples.pagedItems,
						sortBy: {
							key: sortBy.key,
							order: sortBy.order
						}
					}
				})
			}
			break
		}

		case SET_SELECTED_SAMPLES_SORT_DIRECTION: {
			const { stepID, direction } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				return updateStepSamples(state, {
					...stepSamples,
					selectedSamplesSortDirection: direction
				})
			}
			break
		}

		case SHOW_SELECTION_CHANGED_MESSAGE: {
			const { stepID, show } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				return updateStepSamples(state, {
					...stepSamples,
					showSelectionChangedWarning: show
				})
			}
			break
		}
	}
	return state
}


export const sampleNextStepTemplateActions = templateActionsReducerFactory({LIST_TEMPLATE_ACTIONS})
