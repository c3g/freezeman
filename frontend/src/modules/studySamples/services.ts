import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/pagedItemsTable/serializeFilterParamsTS"
import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory, WorkflowStepOrder } from "../../models/fms_api_models"
import { createItemsByID } from "../../models/frontend_models"
import { selectStudiesByID, selectStudySettingsByID, selectWorkflowsByID } from "../../selectors"
import store from "../../store"
import api from "../../utils/api"
import { isNullish } from "../../utils/functions"
import { timestampStringAsDate } from "../../utils/humanReadableTime"
import { fetchLibrariesForSamples, fetchProcesses, fetchProcessMeasurements, fetchSamples, fetchStudies, fetchUsers, fetchWorkflows } from "../cache/cache"
import { CompletedStudySample, StudySampleStep, StudySamplesCount } from "./models"

function getLimitAndOffset(studyID: FMSId, stepOrderID: number) {
	const studySettingsByID = selectStudySettingsByID(store.getState())

	const studySettings = studySettingsByID[studyID]
	if (!studySettings) return;

	const stepSettings = studySettings?.stepSettings
	if (!stepSettings) return;

	const settings = stepSettings[stepOrderID]
	if (!settings) return;

	const limit = settings.pagination.pageSize
	const offset = limit * (settings.pagination.pageNumber - 1)
	return { limit, offset }
}

export async function loadStudySamples(studyID: FMSId) {
	const studiesById = selectStudiesByID(store.getState())
	const workflowsById = selectWorkflowsByID(store.getState())
	const study = studiesById[studyID]
	if (study) {
		const workflow = workflowsById[study.workflow_id]
		if (workflow) {
			return await Promise.all(workflow.steps_order.map((stepOrder) => loadStudySamplesByStep(studyID, stepOrder)))
		}
	}

	return []
}

export async function loadStudySamplesByStep(studyID: FMSId, stepOrder: WorkflowStepOrder) {
	const { offset, limit } = getLimitAndOffset(studyID, stepOrder.id) ?? {}
	
	const study = (await fetchStudies([studyID])).find(obj => obj.id === studyID)
	if(! study) {
		throw new Error(`Study "${studyID}" not found.`)
	}
	if (study.isFetching) {
		throw new Error('Cannot load study samples - study is still fetching.')
	}

	const workflow = (await fetchWorkflows([study.workflow_id])).find(wf => wf.id === study.workflow_id)
	if(! workflow) {
		throw new Error(`Workflow "${study.workflow_id}" not found.`)
	}
	if (workflow.isFetching) {
		throw new Error(`Cannot load study samples - workflow is still fetching`)
	}

	// Each step has its own samples table, with its own filters and sort order, so  we have to request samples for each step separately.
	const fetchSamplesAtStepOrderResponse = await fetchSamplesAtStepOrder(studyID, stepOrder.id)
	const { sampleNextSteps } = fetchSamplesAtStepOrderResponse
	const sampleNextStepsCount: StudySamplesCount = {
		study_id: studyID,
		step: {
			step_order_id: stepOrder.id,
			order: stepOrder.order,
			step_name: stepOrder.step_name,
			count: fetchSamplesAtStepOrderResponse.count
		}
	}
	
	// Get samples that have completed the process at a step
	const stepHistoryResponse = await store.dispatch(api.stepHistory.list({study__id__in: studyID, step_order__id__in: stepOrder.id, limit, offset}))
	if (!stepHistoryResponse.data) {
		throw new Error(`Failed to fetch completed samples for study #${studyID} and step_order #${stepOrder.id}`)
	}
	const completedSamples: FMSStepHistory[] = stepHistoryResponse.data.results
	const completedSamplesCount : StudySamplesCount = {
		study_id: studyID,
		step: {
			step_order_id: stepOrder.id,
			order: stepOrder.order,
			step_name: stepOrder.step_name,
			count: stepHistoryResponse.data.count
		}
	};

	const studySamples = await buildStudySamplesFromWorkflowStepOrder(
		stepOrder,
		sampleNextSteps,
		completedSamples,
		sampleNextStepsCount,
		completedSamplesCount
	)

	// Fetch the study samples
	const sampleList = listSamplesInStep(studySamples)
	if (sampleList.length > 0) {
		const samples = await fetchSamples(sampleList)
		if (samples.length > 0) {
			const sampleIDs = samples.filter(sample => sample.is_library).map(sample => sample.id)
			await fetchLibrariesForSamples(sampleIDs)
		}
	}

	return studySamples
}

function listSamplesInStep(step: StudySampleStep) {
	const samples = new Set<FMSId>(step.samples)
	for(const completed of step.completed) {
		samples.add(completed.sampleID)
	}
	return [...samples.values()]
}

export async function buildStudySamplesFromWorkflowStepOrder(
	stepOrder: WorkflowStepOrder, 
	sampleNextSteps: FMSSampleNextStepByStudy[],
	completedSamples: FMSStepHistory[],
	samplesCount: StudySamplesCount | undefined,
	completedSamplesCount: StudySamplesCount | undefined,
) : Promise<StudySampleStep> {
	const samples = sampleNextSteps.map(nextStep => nextStep.sample)

	const sampleNextStepByStudyBySampleID: StudySampleStep['sampleNextStepByStudyBySampleID'] =
		Object.fromEntries(sampleNextSteps.map((nextStep) => [nextStep.sample, nextStep]))

	// Find the sample count for this step, if it is there. The backend returns nothing
	// if there are zero samples for a step.
	const sampleCountStep = samplesCount?.step
	const completedStep = completedSamplesCount?.step

	const step : StudySampleStep = {
		stepID: stepOrder.step_id,
		stepName: stepOrder.step_name,
		stepOrderID: stepOrder.id,
		stepOrder: stepOrder.order,
		protocolID: stepOrder.protocol_id,
		sampleCount: sampleCountStep ? sampleCountStep.count : 0,
		samples,
		completedCount: completedStep ? completedStep.count : 0, 
		completed: [],
		sampleNextStepByStudyBySampleID
	}

	// Get the process measurements for the completed samples
	const processMeasurementIDs = completedSamples.filter((completed) => !isNullish(completed.process_measurement)).map(completed => completed.process_measurement)
	const processMeasurements = await fetchProcessMeasurements(processMeasurementIDs)
	const processMeasurementsByID = createItemsByID(processMeasurements)

	// Get the processes for the completed samples
	const processIDs = processMeasurements.map(pm => pm.process)
	const processes = await fetchProcesses(processIDs)
	const processesByID = createItemsByID(processes)

	// Get the user ID's for the processes
	const processesUserIDs = processes.map(process => process.created_by)
	// Get the user ID's for the step history without processes
	const stepHistoryUserIDs = completedSamples.filter((completed) => isNullish(completed.process_measurement)).map(completed => completed.created_by)
	const userIDs = processesUserIDs.concat(stepHistoryUserIDs)
	const users = await fetchUsers(userIDs)
	const usersByID = createItemsByID(users)

	completedSamples.forEach(stepHistory => {
		const processMeasurement = processMeasurementsByID[stepHistory.process_measurement]
		const process = processMeasurement ? processesByID[processMeasurement.process] : undefined
		const user = process && process.created_by ? usersByID[process.created_by] : stepHistory.created_by ? usersByID[stepHistory.created_by] : undefined
		
		const completedSample : CompletedStudySample = {
			id: stepHistory.id,
			sampleID: stepHistory.sample,
			generatedSampleID: processMeasurement?.child_sample,
			processID: processMeasurement?.process,
			processMeasurementID: stepHistory.process_measurement,
			executionDate: processMeasurement ? processMeasurement?.execution_date : timestampStringAsDate(stepHistory.created_at),
			executedBy: user?.username,
			comment: processMeasurement?.comment,
			removedFromWorkflow: stepHistory.workflow_action === 'DEQUEUE_SAMPLE'
		}
		step.completed.push(completedSample)
	})

	return step
}

export async function fetchSamplesAtStepOrder(studyID: FMSId, stepOrderID: number) {
	const { offset, limit } = getLimitAndOffset(studyID, stepOrderID) ?? {}

	const studySettingsByID = selectStudySettingsByID(store.getState())

	// Get the current set of filters and sort order from UX settings for study and step
	let options = {}
	const settings = studySettingsByID[studyID]?.stepSettings[stepOrderID]
	if (settings) {
		const serializedFilters = settings.filters ? serializeFilterParamsWithDescriptions(settings.filters) : {}
		const ordering = settings.sortBy ? serializeSortByParams(settings.sortBy) : undefined
		options = {ordering, ...serializedFilters}
	}

	return store.dispatch(api.sampleNextStepByStudy.getStudySamplesForStepOrder(studyID, stepOrderID, {...options, limit, offset}))
		.then(response => {
			if (response.data?.results) {
				return {
					sampleNextSteps: response.data.results as FMSSampleNextStepByStudy[],
					count: response.data.count as number,
				}
			} else {
				throw new Error('Failed to fetch study samples - no data in response.')
			}
		})
}