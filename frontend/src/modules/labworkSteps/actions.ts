import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/shared/WorkflowSamplesTable/serializeFilterParamsTS"
import { FMSId, FMSPagedResultsReponse, FMSSampleNextStep } from "../../models/fms_api_models"
import { FilterDescription, FilterOptions, FilterValue, SortBy } from "../../models/paged_items"
import { selectAuthTokenAccess, selectLabworkStepsState, selectPageSize, selectProtocolsByID, selectSampleNextStepTemplateActions, selectStepsByID } from "../../selectors"
import { networkAction } from "../../utils/actions"
import api from "../../utils/api"
import { fetchLibrariesForSamples, fetchSamples } from "../cache/cache"
import { list as listSamples} from "../samples/actions"
import { CoordinateSortDirection, LabworkPrefilledTemplateDescriptor } from "./models"
import { CLEAR_FILTERS, FLUSH_SAMPLES_AT_STEP, INIT_SAMPLES_AT_STEP, LIST, LIST_TEMPLATE_ACTIONS, SET_FILTER, SET_FILTER_OPTION, SET_SELECTED_SAMPLES, SET_SELECTED_SAMPLES_SORT_DIRECTION, SET_SORT_BY, SHOW_SELECTION_CHANGED_MESSAGE } from "./reducers"
import { getCoordinateOrderingParams, refreshSelectedSamplesAtStep } from "./services"


// Initialize the redux state for samples at step
export function initSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => {
		const stepsByID = selectStepsByID(getState())
		const protocolsByID = selectProtocolsByID(getState())

		// Get the step by step ID from redux
		const step = stepsByID[stepID]
		if (!step) {
			throw Error(`Step with ID ${stepID} could not be found in store.`)
		}

		// Get the step's protocol
		const protocol = protocolsByID[step.protocol_id]
		if (!protocol) {
			throw Error(`Protocol with ID ${step.protocol_id} from step ${step.name} could not be found in store.`)
		}

		// Request the list of template actions for the protocol
		const templateActions = selectSampleNextStepTemplateActions(getState())

		// Request the list of templates for the protocol
		const templatesResponse = await dispatch(api.sampleNextStep.prefill.templates(protocol.id))

		// Convert templates to a list of template descriptors, which include a 'Submit Templates' url.
		const templates = templatesResponse.data.map((templateItem: LabworkPrefilledTemplateDescriptor) => {

			// Find the action ID for the template
			const templateAction = templateActions.find((action) => {
				const matchedTemplate = action.template.find(actionTemplate => actionTemplate.description === templateItem.description)
				return !!matchedTemplate
			})

			const submissionURL = templateAction ? `actions/${templateAction.id}` : undefined
			return {
				...templateItem,
				submissionURL
			}
		})

		// dispatch an action to init the state for this step
		await dispatch({
			type: INIT_SAMPLES_AT_STEP,
			stepID,
			templates
		})

		// Now load the samples for the step
		await dispatch(loadSamplesAtStep(stepID, 1))
	}
}
export function selectAllSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => {
		const labworkState = selectLabworkStepsState(getState())
		const stepSamples = labworkState.steps[stepID]
		if (!stepSamples) {
			throw new Error(`No step samples state found for step ID "${stepID}"`)
		}
		const serializedFilters = serializeFilterParamsWithDescriptions(stepSamples.pagedItems.filters)
		const ordering = serializeSortByParams(stepSamples.pagedItems.sortBy)
		const options = {
			ordering,
			...serializedFilters
		}
		const response = await dispatch(api.sampleNextStep.listSamplesAtStep(stepID, options))
		const results = response.data.results;
		if (results) {
			const selectedSampleIDs = results.map(nextStep => nextStep.sample)
			// We have to load all of the selected samples and libraries for the selected
			// samples table to work properly. This is pretty expensive and the table should
			// be refactored to load pages of samples on demand.
			await fetchSamples(selectedSampleIDs)
			await fetchLibrariesForSamples(selectedSampleIDs)
			
			dispatch(updateSelectedSamplesAtStep(stepID, selectedSampleIDs))
		}	
		else
			return
	}
}
export function loadSamplesAtStep(stepID: FMSId, pageNumber: number) {
	return async (dispatch, getState) => {
		const labworkState = selectLabworkStepsState(getState())
		const stepSamples = labworkState.steps[stepID]
		if (!stepSamples) {
			throw new Error(`No step samples state found for step ID "${stepID}"`)
		}


		// Get the next page of SampleNextSteps 
		const limit = selectPageSize(getState())
		const offset = limit * (pageNumber - 1)
		const serializedFilters = serializeFilterParamsWithDescriptions(stepSamples.pagedItems.filters)
		const ordering = serializeSortByParams(stepSamples.pagedItems.sortBy)
		const options = {
			limit,
			offset,
			ordering,
			...serializedFilters
		}
		const meta = {
			stepID,
			pageNumber,
			limit
		}

		const response: FMSPagedResultsReponse<FMSSampleNextStep> = await dispatch(networkAction(LIST, api.sampleNextStep.listSamplesAtStep(stepID, options), { meta }))
		if (response.count > 0) {
			// Load the associated samples/libraries
			const sampleIDs = response.results.map(nextStep => nextStep.sample)
			const options = { id__in: sampleIDs.join(',') }
			dispatch(listSamples(options))
		}
	}
}

export function refreshSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => {
		const token = selectAuthTokenAccess(getState())
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (token && step) {
			const pageNumber = step.pagedItems.page?.pageNumber ?? 1
			dispatch(loadSamplesAtStep(stepID, pageNumber))

			if (step.selectedSamples.length > 0) {
				const refreshedSelection = await refreshSelectedSamplesAtStep(token, stepID, step.selectedSamples, step.selectedSamplesSortDirection)
				if (refreshedSelection.length !== step.selectedSamples.length) {
					dispatch(showSelectionChangedMessage(stepID, true))
				}
				dispatch(setSelectedSamples(stepID, refreshedSelection))
			}
		}
	}
}

/**
 * When the current selection of samples changes we need to ask the backend to sort the samples
 * for us according to the current sorting criteria. This ensures that when the user generates
 * a prefilled template, the samples will be listed in the template in the same order.
 * 
 * This also has the side-effect of removing any samples from the selection that are no longer
 * at the specified workflow step.
 * 
 * @param stepID : Step ID
 * @param sampleIDs : List of selected sample ID's
 * @returns 
 */
export function updateSelectedSamplesAtStep(stepID: FMSId, sampleIDs: FMSId[]) {
	return async (dispatch, getState) => {
		const token = selectAuthTokenAccess(getState())
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (token && step) {
			const sortedSelection = await refreshSelectedSamplesAtStep(token, stepID, sampleIDs, step.selectedSamplesSortDirection)
			dispatch(setSelectedSamples(stepID, sortedSelection))
		}
	}
}

/**
 * Reload the selected samples. This is used to get a freshly sorted list of selected samples
 * whenever the sort order may have changed.
 * 
 * Does nothing if there are no selected samples.
 * @param stepID Step ID
 * @returns 
 */
function reloadSelectedSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => {
		const token = selectAuthTokenAccess(getState())
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (token && step && step.selectedSamples.length > 0) {
			const sortedSelection = await refreshSelectedSamplesAtStep(token, step.stepID, step.selectedSamples, step.selectedSamplesSortDirection)
			dispatch(setSelectedSamples(stepID, sortedSelection))
		}
	}
}

export function setSelectedSamples(stepID: FMSId, sampleIDs: FMSId[]) {
	return {
		type: SET_SELECTED_SAMPLES,
		stepID,
		sampleIDs
	}
}

export function clearSelectedSamples(stepID: FMSId) {
	return setSelectedSamples(stepID, [])
}

export function flushSamplesAtStep(stepID: FMSId) {
	return {
		type: FLUSH_SAMPLES_AT_STEP,
		stepID
	}
}

export function setFilter(stepID: FMSId, description: FilterDescription, value: FilterValue) {
	return (dispatch) => {
		dispatch({
			type: SET_FILTER,
			stepID,
			value,
			description
		})
		// Reset the sample list
		dispatch(loadSamplesAtStep(stepID, 1))
	}
}

export function setFilterOptions(stepID: FMSId, description: FilterDescription, options: FilterOptions) {
	return (dispatch) => {
		dispatch({
			type: SET_FILTER_OPTION,
			stepID,
			options,
			description
		})
		// Reset the sample list
		dispatch(loadSamplesAtStep(stepID, 1))
	}
}

export function clearFilters(stepID: FMSId) {
	return (dispatch) => {
		dispatch({
			type: CLEAR_FILTERS,
			stepID
		})
		// Reset the sample list
		dispatch(loadSamplesAtStep(stepID, 1))
	}
}

export function setSortBy(stepID: FMSId, sortBy: SortBy) {
	return (dispatch) => {
		dispatch({
			type: SET_SORT_BY,
			stepID,
			sortBy
		})
		dispatch(loadSamplesAtStep(stepID, 1))
	}
}

export function setSelectedSamplesSortDirection(stepID: FMSId, direction: CoordinateSortDirection) {
	return ((dispatch) => {
		dispatch({
			type: SET_SELECTED_SAMPLES_SORT_DIRECTION,
			stepID,
			direction
		})
		dispatch(reloadSelectedSamplesAtStep(stepID))
	})
}

export const listTemplateActions = () => (dispatch, getState) => {
	if (getState().sampleNextStepTemplateActions.isFetching) return;
	return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.sampleNextStep.template.actions()));
}

/**
 * Request a prefilled template for a step, containing a list selected samples.
 * @param templateID Template ID from sample-next-step templates
 * @param stepID Step ID
 * @returns 
 */
export const requestPrefilledTemplate = (templateID: FMSId, stepID: FMSId, user_prefill_data: any) => {
	return async (dispatch, getState) => {
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (step) {
			const options = {
				step__id__in: stepID,
				sample__id__in: step.selectedSamples.join(','),
				ordering: getCoordinateOrderingParams(step.selectedSamplesSortDirection),
			}
			// {"Volume Used (uL)" : "30"}
			const fileData = await dispatch(api.sampleNextStep.prefill.request(templateID, JSON.stringify(user_prefill_data) , options))
			return fileData
		}
	}
}

/**
 * This flag is set if any selected samples are removed from the user's selection after
 * a refresh, so that we can let the user know that their selection has changed.
 * @param stepID 
 * @returns 
 */
export function showSelectionChangedMessage(stepID: FMSId, show: boolean) {
	return {
		type: SHOW_SELECTION_CHANGED_MESSAGE,
		stepID,
		show
	}
}

