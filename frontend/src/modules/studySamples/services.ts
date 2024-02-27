import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/pagedItemsTable/serializeFilterParamsTS"
import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory, WorkflowStepOrder } from "../../models/fms_api_models"
import { createItemsByID } from "../../models/frontend_models"
import { selectStudiesByID, selectStudySettingsByID, selectWorkflowsByID } from "../../selectors"
import store from "../../store"
import api from "../../utils/api"
import { isNullish } from "../../utils/functions"
import { timestampStringAsDate } from "../../utils/humanReadableTime"
import { fetchLibrariesForSamples, fetchSamples, fetchStudies, fetchUsers, fetchWorkflows } from "../cache/cache"
import { CompletedStudySample, PreStudySampleStep, StudySampleStep, StudySamplesCount } from "./models"

export async function loadStudySamples(studyID: FMSId): Promise<{ steps: PreStudySampleStep[] }> {
	const studiesById = selectStudiesByID(store.getState())
	const workflowsById = selectWorkflowsByID(store.getState())
	const study = studiesById[studyID]
	if (study) {
		const workflow = workflowsById[study.workflow_id]
		if (workflow) {
			return {
				steps: await Promise.all(workflow.steps_order.map((stepOrder) => loadStudySamplesByStep(studyID, stepOrder)))
			}
		}
	}

	return { steps: [] }
}

export async function loadStudySamplesByStep(studyID: FMSId, stepOrder: WorkflowStepOrder) {
	const offset = 0
	const limit = 10000

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

	return {
		stepOrder,
		sampleNextSteps,
		completedSamples,
		sampleNextStepsCount,
		completedSamplesCount
	}
}

export async function fetchSamplesAndLibrariesForStep(sampleList: number[]) {
	if (sampleList.length > 0) {
		const samples = await fetchSamples(sampleList)
		if (samples.length > 0) {
			const sampleIDs = samples.filter(sample => sample.is_library).map(sample => sample.id)
			await fetchLibrariesForSamples(sampleIDs)
		}
	}
}

export async function buildStudySamplesFromWorkflowStepOrder({
	stepOrder, 
	sampleNextSteps,
	completedSamples,
	sampleNextStepsCount,
	completedSamplesCount,
}: PreStudySampleStep) : Promise<StudySampleStep> {
	const samples = sampleNextSteps.map(nextStep => nextStep.sample)

	const sampleNextStepByStudyBySampleID: StudySampleStep['sampleNextStepByStudyBySampleID'] =
		Object.fromEntries(sampleNextSteps.map((nextStep) => [nextStep.sample, nextStep]))

	// Find the sample count for this step, if it is there. The backend returns nothing
	// if there are zero samples for a step.
	const sampleCountStep = sampleNextStepsCount?.step
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

	const stepHistoryUserIDs = completedSamples.filter((completed) => isNullish(completed.process_measurement)).map(completed => completed.created_by)
	const userIDs = stepHistoryUserIDs // processesUserIDs are fetched lazily in CompletedSamplesTable
	const users = await fetchUsers(userIDs)
	const usersByID = createItemsByID(users)

	completedSamples.forEach(stepHistory => {		
		// process.created_by is fetched lazily in CompletedSamplesTable
		const user = stepHistory.created_by ? usersByID[stepHistory.created_by] : undefined

		const completedSample : CompletedStudySample = {
			id: stepHistory.id,
			sampleID: stepHistory.sample,
			processMeasurementID: stepHistory.process_measurement,
			executionDate: timestampStringAsDate(stepHistory.created_at), // processMeasurement?.execution_date is fetched lazily in CompletedSamplesTable
			executedBy: user?.username,
			removedFromWorkflow: stepHistory.workflow_action === 'DEQUEUE_SAMPLE'
		}
		step.completed.push(completedSample)
	})

	return step
}

export async function fetchSamplesAtStepOrder(studyID: FMSId, stepOrderID: number) {
	const offset = 0
	const limit = 10000

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