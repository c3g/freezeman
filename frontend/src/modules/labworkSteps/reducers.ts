import { AnyAction } from 'redux'
import { CoordinateSpec, FMSId, LabworkStepInfo, SampleLocator } from '../../models/fms_api_models'
import { Container, createItemsByID, SampleNextStep } from '../../models/frontend_models'
import { reduceClearFilters, reduceSetFilter, reduceSetFilterOptions } from '../../models/paged_items_reducers'
import { createNetworkActionTypes } from '../../utils/actions'
import { templateActionsReducerFactory } from '../../utils/templateActions'
import { LabworkStepSamples, LabworkStepSamplesGroup, LabworkStepsState, LabworkStepSummaryState } from './models'
import { createPagedItems, createPagedItemsByID } from '../../models/paged_items'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

export const INIT_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:INIT_SAMPLES_AT_STEP'
export const LIST = createNetworkActionTypes('LABWORK_STEP')
export const SET_SELECTED_SAMPLES = 'SAMPLES_AT_STEP:SET_SELECTED_SAMPLES'
export const REFRESH_SELECTED_SAMPLES = createNetworkActionTypes('SAMPLES_AT_STEP:REFRESH_SELECTED_SAMPLES')
export const FLUSH_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:LOAD_SAMPLES_AT_STEP'
export const SET_FILTER = 'SAMPLES_AT_STEP:SET_FILTER'
export const SET_FILTER_OPTION = 'SAMPLES_AT_STEP:SET_FILTER_OPTION'
export const CLEAR_FILTERS = 'SAMPLES_AT_STEP:CLEAR_FILTERS'
export const SET_SORT_BY = 'SAMPLES_AT_STEP:SET_SORT_BY'
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("SAMPLES_AT_STEP.LIST_TEMPLATE_ACTIONS")
export const SHOW_SELECTION_CHANGED_MESSAGE = 'SAMPLES_AT_STEP:SHOW_SELECTION_CHANGED_MESSAGE'
export const SET_SELECTED_SAMPLES_SORT_DIRECTION = 'SAMPLES_AT_STEP:SET_SELECTED_SAMPLES_SORT_DIRECTION'
export const GET_LABWORK_STEP_SUMMARY = createNetworkActionTypes('SAMPLES_AT_STEP.GET_LABWORK_STEP_SUMMARY')
export const SELECT_SAMPLES_IN_GROUPS = [SET_SELECTED_SAMPLES, 'SAMPLES_AT_STEP:SET_SELECTED_SAMPLES_IN_GROUPS'] as const


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
			const { stepID, templates, actions } = action
			const stepSamples: LabworkStepSamples = {
				stepID,
				pagedItems: createPagedItemsByID(),
				displayedSamples: [],
				selectedSamples: {
					items: [],
					isFetching: false,
					isSorted: true,
					sortDirection: {orientation: 'column', order: 'ascend'},
				},
				prefill: {
					templates
				},
				action: {
					templates: actions
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
			const { stepID, sampleIDs, isSorted } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if(!stepSamples) {
				return state
			}
			const newStepSamples : LabworkStepSamples = {
				...stepSamples,
				selectedSamples: {
					...stepSamples.selectedSamples,
					items: sampleIDs,
					isSorted
				}
			}
			return updateStepSamples(state, newStepSamples)
		}
		case REFRESH_SELECTED_SAMPLES.REQUEST: {
			const { stepID } = action
			
			const stepSamples = getStepSamplesByID(state, stepID)
			if (!stepSamples) {
				return state
			}

			return updateStepSamples(state, {
				...stepSamples,
				selectedSamples: {
					...stepSamples.selectedSamples,
					isFetching: true
				}
			})
		}
		case REFRESH_SELECTED_SAMPLES.RECEIVE: {
			const { stepID, sampleIDs } = action
			
			const stepSamples = getStepSamplesByID(state, stepID)
			if (!stepSamples) {
				return state
			}

			return updateStepSamples(state, {
				...stepSamples,
				selectedSamples: {
					...stepSamples.selectedSamples,
					items: sampleIDs,
					isFetching: false,
					isSorted: true,
				}
			})
		}
		case REFRESH_SELECTED_SAMPLES.ERROR: {
			const { stepID } = action
			
			const stepSamples = getStepSamplesByID(state, stepID)
			if (!stepSamples) {
				return state
			}

			return updateStepSamples(state, {
				...stepSamples,
				selectedSamples: {
					...stepSamples.selectedSamples,
					isFetching: false,
				}
			})
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
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: reduceSetFilter(stepSamples.pagedItems, description, value)
				})
			}
			break
		}

		case SET_FILTER_OPTION: {
			const { stepID, options, description } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: reduceSetFilterOptions(stepSamples.pagedItems, description, options)
				})
			}
			break
		}

		case CLEAR_FILTERS: {
			const { stepID } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: reduceClearFilters(stepSamples.pagedItems)
				})
			}
			break
		}

		case SET_SORT_BY: {
			const { stepID, sortByList } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				return updateStepSamples(state, {
					...stepSamples,
					pagedItems: {
						...stepSamples.pagedItems,
						sortByList
					}
				})
			}
			break
		}

		case SET_SELECTED_SAMPLES_SORT_DIRECTION: {
			const { stepID, direction } = action
			const stepSamples = getStepSamplesByID(state, stepID)
			if (stepSamples) {
				const selectedSamples = stepSamples.selectedSamples
				return updateStepSamples(state, {
					...stepSamples,
					selectedSamples: {
						...stepSamples.selectedSamples,
						sortDirection: direction,
						// if isSorted is false, stay false until REFRESH_SELECTED_SAMPLES is executed
						isSorted: selectedSamples.isSorted && (selectedSamples.sortDirection === direction)
					}
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
					selectedSamples: {
						...stepSamples.selectedSamples,
					},
					showSelectionChangedWarning: show
				})
			}
			break
		}
	}
	return state
}

export const labworkStepSummary = (state: LabworkStepSummaryState = {isFetching: false}, action: AnyAction) : LabworkStepSummaryState => {
	switch(action.type) {
		case GET_LABWORK_STEP_SUMMARY.REQUEST: {
			return {
				...state,
				isFetching: true
			}
		}

		case GET_LABWORK_STEP_SUMMARY.RECEIVE: {
			const data = action.data as LabworkStepInfo["results"]["samples"]["groups"]
			return {
				...state,
				isFetching: false,
				groups: data.map((group) => ({
					name: group.name,
					count: group.count,
					sample_locators: group.sample_locators.reduce((prev, curr) => {
						prev[curr.sample_id] = curr
						return prev
					}, {}),
					selected_samples: {},
					containers: undefined
				} as LabworkStepSamplesGroup))
			}
		}

		case GET_LABWORK_STEP_SUMMARY.ERROR: {
			return {
				...state,
				isFetching: false,
				error: action.error
			}
		}
	}
	if (SELECT_SAMPLES_IN_GROUPS.some((s) => s === action.type)) {
		const { sampleIDs } = action as unknown as { sampleIDs: FMSId[] }
		return {
			...state,
			groups: state.groups?.map((group) => ({
				...group,
				selected_samples: sampleIDs.reduce((selected_samples, sampleID) => {
				    const locator = group.sample_locators[sampleID]
				    if (locator) {
				        selected_samples[sampleID] = locator
				    }
				    return selected_samples
				}, {} as Record<string, SampleLocator>)
			})) ?? []
		}
	}
	return state
}

export const sampleNextStepTemplateActions = templateActionsReducerFactory({LIST_TEMPLATE_ACTIONS})

// undefined is for tubes without parent

export interface LabworkStepPlacementParentContainer {
	name: Container['name']
	barcode: Container['barcode']
	kind: Container['kind']
	spec: CoordinateSpec
}
type LabworkStepPlacementContainer = LabworkStepPlacementParentContainer | {
	name: null
	// barcode?: undefined
	// kind?: undefined
	spec: []
}

export interface LabworkStepPlacementState {
	sourceContainers: LabworkStepPlacementContainer[]
	destinationContainers: LabworkStepPlacementParentContainer[]
	activeSourceContainer: LabworkStepPlacementContainer | undefined
	activeDestinationContainer: LabworkStepPlacementParentContainer | undefined
	error?: string
}
const labworkStepPlacementSlice = createSlice({
	name: 'LABWORK_STEP:PLACEMENT',
	initialState: {
		sourceContainers: [],
		destinationContainers: [],
		activeSourceContainer: undefined,
		activeDestinationContainer: undefined
	} as LabworkStepPlacementState,
	reducers: {
		loadSourceContainer(state, action: PayloadAction<LabworkStepPlacementContainer>) {
			const payload = action.payload
			if (!selectSourceContainer(state)(payload.name)) {
				state.sourceContainers.push(payload)
			}
		},
		loadDestinationContainer(state, action: PayloadAction<Required<LabworkStepPlacementParentContainer>>) {
			const payload = action.payload
			if (!selectDestinationContainer(state)(payload.name)) {
				state.destinationContainers.push(payload)
			}
		},
		setActiveSourceContainer(state, action: PayloadAction<string | null>) {
			const container = selectSourceContainer(state)(action.payload)
			if (!container) {
				state.error = `Could not find source container '${action.payload}'`
				return
			}
			state.activeSourceContainer = container
		},
		setActiveDestinationContainer(state, action: PayloadAction<string>) {
			const container = selectDestinationContainer(state)(action.payload)
			if (!container) {
				state.error = `Could not find destination container '${action.payload}'`
				return
			}
			state.activeDestinationContainer = container
		},
		flushContainers(state, action: PayloadAction<(string | null)[] | undefined>) {
			const payload = action.payload
			if (payload === undefined) {
				state.sourceContainers = []
				state.destinationContainers = []
				state.activeSourceContainer = undefined
				state.activeDestinationContainer = undefined
				return
			}
			const names = new Set(payload)
			state.sourceContainers = state.sourceContainers.filter((c) => !names.has(c.name))
			state.destinationContainers = state.destinationContainers.filter((c) => !names.has(c.name))
			for (const name of names) {
				if (name === state.activeSourceContainer?.name) {
					state.activeSourceContainer = undefined
				}
				if (name === state.activeDestinationContainer?.name) {
					state.activeDestinationContainer = undefined
				}
			}
		}
	}
})
export const { loadSourceContainer, loadDestinationContainer, setActiveDestinationContainer, setActiveSourceContainer, flushContainers } = labworkStepPlacementSlice.actions
export const labworkStepPlacement = labworkStepPlacementSlice.reducer

export const selectSourceContainer = (state: LabworkStepPlacementState) => (name: string | null) => state.sourceContainers.find((c) => c.name === name)
export const selectDestinationContainer = (state: LabworkStepPlacementState) => (name: string) => state.destinationContainers.find((c) => c.name === name)
