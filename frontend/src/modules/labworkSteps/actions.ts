import { notification } from "antd"
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/pagedItemsTable/serializeFilterParamsTS"
import { FMSContainer, FMSId, LabworkStepInfo } from "../../models/fms_api_models"
import { Step } from "../../models/frontend_models"
import { FilterDescription, FilterOptions, FilterValue, SortBy } from "../../models/paged_items"
import { selectAuthTokenAccess, selectLabworkStepsState, selectPageSize, selectProtocolsByID, selectSampleNextStepTemplateActions, selectStepsByID, selectLabworkStepSummaryState, selectContainerKindsByID } from "../../selectors"
import { AppDispatch, RootState } from "../../store"
import { networkAction } from "../../utils/actions"
import api from "../../utils/api"
import { flushContainers as flushPlacementContainers, loadContainer as loadPlacementContainer } from "../placement/reducers"
import { CoordinateSortDirection, LabworkPrefilledTemplateDescriptor } from "./models"
import { CLEAR_FILTERS, FLUSH_SAMPLES_AT_STEP, INIT_SAMPLES_AT_STEP, LIST, LIST_TEMPLATE_ACTIONS, SET_FILTER, SET_FILTER_OPTION, SET_SELECTED_SAMPLES, SET_SELECTED_SAMPLES_SORT_DIRECTION, SET_SORT_BY, SHOW_SELECTION_CHANGED_MESSAGE, GET_LABWORK_STEP_SUMMARY, SELECT_SAMPLES_IN_GROUPS, REFRESH_SELECTED_SAMPLES, loadSourceContainer, flushContainers as flushLabworkStepPlacementContainers, LabworkStepPlacementParentContainer } from "./reducers"
import { getCoordinateOrderingParams, refreshSelectedSamplesAtStep } from "./services"
import { downloadFromFile } from "../../utils/download"
import { fetchSamples } from "../cache/cache"
import { selectDestinationContainers, selectSourceContainers } from "./selectors"
import { selectRealParentContainer } from "../placement/selectors"


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
		if (!protocol && step.type === "PROTOCOL") {
			throw Error(`Protocol with ID ${step.protocol_id} from step ${step.name} could not be found in store.`)
		}
    else if (!protocol) {
      await dispatch({
        type: INIT_SAMPLES_AT_STEP,
        stepID,
        templates: [],
        actions: []
      })
    }
    else {
      // Request the list of template actions for the protocol
      const templateActions = selectSampleNextStepTemplateActions(getState())

      // Request the list of templates for the protocol
      const templatesResponse = await dispatch(api.sampleNextStep.prefill.templates(protocol.id)).then(
        (response) => {
          const filteredResponse = { ...response }
          if (!step.needs_planning){
            filteredResponse.data = response.data.filter((template) => {return !template.description.includes("planning")})
          }
          return filteredResponse
        }
      )


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
      // List of template descriptors for available actions, which include a 'Submit Templates' url.      
      const actionsAvailable = templateActions.filter((action) => {
        const matchedTemplate = action.template.find(actionTemplate => actionTemplate.protocol === protocol.name)
        return !!matchedTemplate
      })
      
      const actions = actionsAvailable.map((templateAction) => {
        const submissionURL = templateAction ? `actions/${templateAction.id}` : undefined
        return {
          id: templateAction.id,
          description: templateAction.description,
          prefillFields: [],
          submissionURL,
        }
      })
      // dispatch an action to init the state for this step
      await dispatch({
        type: INIT_SAMPLES_AT_STEP,
        stepID,
        templates,
        actions
      })
    }		
	}
}

export function loadSampleNextStepsAtStep(stepID: FMSId, pageNumber: number, pageSize?: number) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const labworkState = selectLabworkStepsState(getState())
		const stepSamples = labworkState.steps[stepID]
		if (!stepSamples) {
			throw new Error(`No step samples state found for step ID "${stepID}"`)
		}


		// Get the next page of SampleNextSteps 
		const limit = pageSize ?? selectPageSize(getState())
		const offset = limit * (pageNumber - 1)
		const serializedFilters = serializeFilterParamsWithDescriptions(stepSamples.pagedItems.filters)
		const ordering = serializeSortByParams(stepSamples.pagedItems.sortByList)
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

		return await dispatch(networkAction(LIST, api.sampleNextStep.listSamplesAtStep(stepID, options), { meta }))
	}
}

export function loadSamplesAtStep(stepID: FMSId, pageNumber: number) {
	return async (dispatch: AppDispatch) => {
		const response = await dispatch(loadSampleNextStepsAtStep(stepID, pageNumber))
		if (response.count > 0) {
			// Load the associated samples/libraries
			const sampleIDs = response.results.map(nextStep => nextStep.sample)
			return await fetchSamples(sampleIDs)
		}
		return []
	}
}

export function refreshSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => {
		const token = selectAuthTokenAccess(getState())
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (token && step) {
			const pageNumber = step.pagedItems.page?.pageNumber ?? 1
			await dispatch(loadSamplesAtStep(stepID, pageNumber))

			if (step.selectedSamples.items.length > 0 && !step.selectedSamples.isSorted && !step.selectedSamples.isFetching) {
				dispatch(sortingSelectedSamples(stepID))
				const refreshedSelection = await refreshSelectedSamplesAtStep(token, stepID, step.selectedSamples.items, step.selectedSamples.sortDirection)
				if (refreshedSelection.length !== step.selectedSamples.items.length) {
					dispatch(showSelectionChangedMessage(stepID, true))
				}
				dispatch(receiveSortedSelectedSamples(stepID, refreshedSelection))
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
		if (token && step && !step.selectedSamples.isSorted && !step.selectedSamples.isFetching) {
			dispatch(sortingSelectedSamples(stepID))
			const sortedSelection = await refreshSelectedSamplesAtStep(token, stepID, sampleIDs, step.selectedSamples.sortDirection)
			dispatch(receiveSortedSelectedSamples(stepID, sortedSelection))
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
		if (token && step && step.selectedSamples.items.length > 0 && !step.selectedSamples.isSorted && !step.selectedSamples.isFetching) {
			dispatch(sortingSelectedSamples(stepID))
			const sortedSelection = await refreshSelectedSamplesAtStep(token, step.stepID, step.selectedSamples.items, step.selectedSamples.sortDirection)
			dispatch(receiveSortedSelectedSamples(stepID, sortedSelection))
		}
	}
}

export function setSelectedSamples(stepID: FMSId, sampleIDs: FMSId[], isSorted = false) {
	return {
		type: SET_SELECTED_SAMPLES,
		stepID,
		sampleIDs,
		isSorted
	}
}

export function unselectSamples(stepID: FMSId, unselectedSampleIDs: FMSId[]) {
	return (dispatch: AppDispatch, getState: () => RootState) => {
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (step) {
			const unselectedSampleIDSet = new Set(unselectedSampleIDs)
			const retainedSampleIDs = step.selectedSamples.items.filter((sampleID) => !unselectedSampleIDSet.has(sampleID))
			dispatch(setSelectedSamples(stepID, retainedSampleIDs, true))
		}
	}
}

export function clearSelectedSamples(stepID: FMSId) {
	return setSelectedSamples(stepID, [], true)
}

export function flushSamplesAtStep(stepID: FMSId) {
	return {
		type: FLUSH_SAMPLES_AT_STEP,
		stepID
	}
}

export function setFilter(stepID: FMSId, description: FilterDescription, value: FilterValue, reset = true) {
	return (dispatch) => {
		dispatch({
			type: SET_FILTER,
			stepID,
			value,
			description
		})
		// Reset the sample list
		if (reset)
			dispatch(loadSamplesAtStep(stepID, 1))
	}
}

export function setFilterOptions(stepID: FMSId, description: FilterDescription, options: FilterOptions, reset = true) {
	return (dispatch) => {
		dispatch({
			type: SET_FILTER_OPTION,
			stepID,
			options,
			description
		})
		// Reset the sample list
		if (reset)
			dispatch(loadSamplesAtStep(stepID, 1))
	}
}

export function clearFilters(stepID: FMSId, refresh: boolean = true) {
	return (dispatch) => {
		dispatch({
			type: CLEAR_FILTERS,
			stepID
		})
		// Reset the sample list
    if (refresh) {
		  dispatch(loadSamplesAtStep(stepID, 1))
    }
	}
}

export function setSortByList(stepID: FMSId, sortByList: SortBy[]) {
	return (dispatch) => {
		dispatch({
			type: SET_SORT_BY,
			stepID,
			sortByList
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
export const requestPrefilledTemplate = (templateID: FMSId, stepID: FMSId, user_prefill_data: any, placement_data: any) => {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (step) {
			const options = {
				step__id__in: stepID,
				ordering: getCoordinateOrderingParams(step.selectedSamples.sortDirection),
			}
			// {"Volume Used (uL)" : "30"}
			const fileData = await dispatch(api.sampleNextStep.prefill.request(templateID, JSON.stringify(user_prefill_data), JSON.stringify(placement_data), step.selectedSamples.items.join(','), options))
			return fileData
		}
	}
}

/**
 * Request the execution of a step automation, containing a list selected samples.
 * @param stepID Step ID
 * @param additionalData object containing additional information for automation
 * @returns 
 */
export const requestAutomationExecution = (stepID: FMSId, additionalData: object) => {
	return async (dispatch, getState) => {
		const labworkStepsState = selectLabworkStepsState(getState())
		const step = labworkStepsState.steps[stepID]
		if (step) {
			const options = {
				step__id__in: stepID,
				sample__id__in: step.selectedSamples.items.join(','),
				ordering: getCoordinateOrderingParams(step.selectedSamples.sortDirection),
			}
			const response = await dispatch(api.sampleNextStep.executeAutomation(stepID, JSON.stringify(additionalData), options))
			return response
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

export const getLabworkStepSummary = (stepID: FMSId, groupBy: string, options, sampleIDs: FMSId[] = []) => async (dispatch: AppDispatch, getState: () => RootState) => {
	const summary = selectLabworkStepSummaryState(getState())
	if (summary && summary.isFetching) {
		return
	}

	dispatch({ type: GET_LABWORK_STEP_SUMMARY.REQUEST })

	try {
		const response = await dispatch(api.sampleNextStep.labworkStepSummary(stepID, groupBy, options, sampleIDs))
		const summary = response.data.results.samples.groups
		dispatch({
			type: GET_LABWORK_STEP_SUMMARY.RECEIVE,
			data: summary
		})
	} catch (err) {
		dispatch({
			type: GET_LABWORK_STEP_SUMMARY.ERROR,
			error: err
		})
	}
}

export function setSelectedSamplesInGroups(sampleIDs: FMSId[]) {
	return {
		type: SELECT_SAMPLES_IN_GROUPS[1],
		sampleIDs
	}
}

function sortingSelectedSamples(stepID: FMSId) {
	return {
		type: REFRESH_SELECTED_SAMPLES.REQUEST,
		stepID
	}
}
function receiveSortedSelectedSamples(stepID: FMSId, sampleIDs: FMSId[]) {
	return {
		type: REFRESH_SELECTED_SAMPLES.RECEIVE,
		stepID,
		sampleIDs
	}
}

export function fetchAndLoadSourceContainers(stepID: FMSId, sampleIDs: FMSId[]) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const oldContainerNames = selectSourceContainers(getState()).map((c) => c.name)
		const newContainerNames: (string | null)[] = []

		const containerKinds = selectContainerKindsByID(getState())
		const values: LabworkStepInfo = sampleIDs.length > 0
			? (await dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", {}, sampleIDs))).data
			: { results: { step_id: stepID, samples: { grouping_column: "ordering_container_name", groups: [] } } }
		const containerGroups = values.results.samples.groups
		for (const containerGroup of containerGroups) {
			// Handles containers like 'tubes without container'. It assumes there isn't a container named like that.
			const [containerDetail] = await dispatch(api.containers.list({ name: containerGroup.name })).then(container => container.data.results as ([FMSContainer] | []))
			if (containerDetail) {
				const spec = containerKinds[containerDetail.kind].coordinate_spec
				dispatch(loadPlacementContainer({
					parentContainerName: containerDetail.name,
					spec,
					cells: containerGroup.sample_locators.map((locator) => {
						return {
							sample: locator.sample_id,
							name: locator.sample_name,
							projectName: locator.project_name,
							coordinates: locator.contextual_coordinates
						}
					})
				}))
				dispatch(loadSourceContainer({
					name: containerDetail.name,
					spec,
					barcode: containerDetail.barcode,
					kind: containerDetail.kind
				}))
				newContainerNames.push(containerDetail.name)
			} else {
				dispatch(loadPlacementContainer({
					parentContainerName: null,
					cells: containerGroup.sample_locators.map((locator) => {
						return {
							sample: locator.sample_id,
							name: locator.sample_name,
							projectName: locator.project_name,
						}
					})
				}))
				dispatch(loadSourceContainer({
					name: null,
					spec: []
				}))
				newContainerNames.push(null)
			}
		}

		// remove outdated containers in placement
		const toFlushContainers = oldContainerNames.filter((n) => !newContainerNames.includes(n))
		dispatch(flushPlacementContainers(toFlushContainers.map((n) => ({ name: n }))))
		dispatch(flushLabworkStepPlacementContainers(toFlushContainers))

		return newContainerNames
	}
}

export function prefillTemplate(template: LabworkPrefilledTemplateDescriptor, step: Step, prefillData: { [column: string]: any }) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		type PlacementData = {
			[key in FMSId]: {
				coordinates: string,
				container_name: string,
				container_barcode: string,
				container_kind: string
			}[]
		}

		let placementData: PlacementData = {}
		try {
			const destinationContainers = selectDestinationContainers(getState())

			placementData = destinationContainers.reduce((placementData, destinationContainer) => {
				const container = selectRealParentContainer(getState())(destinationContainer)
				for (const { sample, cell } of container.getPlacements()) {
					if (sample.fromCell && sample.fromCell.sameCellAs(cell))
						// skip if the sample is existing in the cell
						continue
					placementData[sample.id] ??= []
					placementData[sample.id].push({
						coordinates: cell.coordinates,
						container_name: destinationContainer.name,
						container_barcode: destinationContainer.barcode as string,
						container_kind: destinationContainer.kind as string
					})
				}
				return placementData
			}, {} as PlacementData)
		} catch (e) {
			notification.error({
				message: e.message,
				key: 'LabworkStep.Placement.Prefilling-Failed',
				duration: 20
			})
		}

		try {
			const result = await dispatch(requestPrefilledTemplate(template.id, step.id, prefillData, placementData))
			if (result) {
				downloadFromFile(result.filename, result.data)
			}
		} catch (err) {
			console.error(err)
		}
	}
}

export function fetchSamplesheet(activeDestinationContainer: LabworkStepPlacementParentContainer) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		type PlacementData = {
			coordinates: string,
			sample_id: FMSId,
		}[]

		const placementData: PlacementData = []
		try {
			const container = selectRealParentContainer(getState())(activeDestinationContainer)
			for (const { sample, cell } of container.getPlacements()) {
				if (sample.fromCell && sample.fromCell.sameCellAs(cell))
					// skip if the sample is existing in the cell
					continue
				placementData.push({
					coordinates: cell.coordinates,
					sample_id: sample.id,
				})
			}
		} catch (e) {
			notification.error({
				message: e.message,
				key: 'LabworkStep.Placement.GetSamplesheet',
				duration: 20
			})
		}

		try {
			const fileData = await dispatch(api.samplesheets.getSamplesheet(activeDestinationContainer.barcode, activeDestinationContainer.kind, placementData))

			if (fileData && fileData.ok) {
				downloadFromFile(fileData.filename, fileData.data)
			}
		}
		catch (e) {
			notification.error({
				message: e.data,
				key: 'LabworkStep.Placement.GetSamplesheet',
				duration: 20
			})
		}
	}
}