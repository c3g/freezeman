import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/shared/WorkflowSamplesTable/serializeFilterParamsTS"
import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory, FMSStudySamplesCounts } from "../../models/fms_api_models"
import { createItemsByID, Study, Workflow } from "../../models/frontend_models"
import { selectStudySettingsByID } from "../../selectors"
import store from "../../store"
import api from "../../utils/api"
import { fetchLibrariesForSamples, fetchProcesses, fetchProcessMeasurements, fetchSamples, fetchStudies, fetchUsers, fetchWorkflows } from "./cache"
import { CompletedStudySample, StudySampleList, StudySampleStep } from "./models"


export async function loadStudySamples(studyID: FMSId) {
	
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

	// Each step has its own samples table, with its own filters and sort order, so
	// we have to request samples for each step separately. Create one request per step.
	
	const requests = workflow.steps_order.map(step => {
		return fetchSamplesAtStep(studyID, step.step_id)
	})

	// Create a map object with step ID as key and list of SampleNextSteps as values.
	const groupedSampleNextSteps = {}
	try {
		const steps = await Promise.all(requests)
		for (const step of steps) {
			groupedSampleNextSteps[step.stepID] = step.sampleNextSteps
		}
	} catch(err) {
		throw new Error('Failed to fetch study samples')
	}
	
	// Get samples that have completed the process at a step
	let completedSamplesByStudy : FMSStepHistory[] | undefined
	const sampleHistoryResponse = await store.dispatch(api.stepHistory.getCompletedSamplesForStudy(studyID))
	if (sampleHistoryResponse.data.results) {
		completedSamplesByStudy = sampleHistoryResponse.data.results as FMSStepHistory[]
	} else {
		throw new Error('Failed to fetch completed samples for study')
	}

	// Get the total sample counts for queued samples and completed samples, for display in the UX.
	let sampleCounts : FMSStudySamplesCounts | undefined = undefined
	const sampleCountResponse = await store.dispatch(api.sampleNextStepByStudy.countStudySamples(studyID))
	if (sampleCountResponse.data.length > 0) {
		sampleCounts = sampleCountResponse.data[0] as FMSStudySamplesCounts
	}
	

	let completedSampleCounts : FMSStudySamplesCounts | undefined = undefined
	const completedSampleCountResponse = await store.dispatch(api.stepHistory.countStudySamples(studyID))
	if (completedSampleCountResponse.data.length > 0) {
		completedSampleCounts = completedSampleCountResponse.data[0]
	}

	const studySamples = await buildStudySamplesFromWorkflow(study, workflow, groupedSampleNextSteps, completedSamplesByStudy, sampleCounts, completedSampleCounts)

	// Fetch the study samples
	const sampleList = listSamplesInStudy(studySamples)
	if (sampleList.length > 0) {
		const samples = await fetchSamples(sampleList)
		if (samples.length > 0) {
			const sampleIDs = samples.filter(sample => sample.is_library).map(sample => sample.id)
			await fetchLibrariesForSamples(sampleIDs)
		}
	}
	return {
		steps: studySamples.steps
	}
}

function listSamplesInStudy(study: StudySampleList) {
	const samples = new Set<FMSId>()
	for (const step of study.steps) {
		const samplesInStep = listSamplesInStep(step)
		for (const sample of samplesInStep) {
			samples.add(sample)
		}
	}
	return [...samples]
}

function listSamplesInStep(step: StudySampleStep) {
	const samples = new Set<FMSId>(step.samples)
	for(const completed of step.completed) {
		samples.add(completed.sampleID)
	}
	return [...samples.values()]
}

export async function buildStudySamplesFromWorkflow(
	study: Study, 
	workflow: Workflow, 
	sampleNextStepsByStep: {[key: FMSId] : FMSSampleNextStepByStudy[]},
	completedSamplesByStudy: FMSStepHistory[],
	sampleCounts: FMSStudySamplesCounts | undefined,
	completedSampleCounts: FMSStudySamplesCounts | undefined,
	) : Promise<StudySampleList> {

	const stepMap = new Map<FMSId, StudySampleStep>()

	// Create the list of study steps from the workflow, starting and ending at the steps defined in the study.
	workflow.steps_order.forEach(stepOrder => {
		if (stepOrder.order >= study.start && stepOrder.order <= study.end) {

			// Get the list of sample-next-steps retrieved for this step, and set
			// the list of samples for the step.
			const sampleNextSteps = sampleNextStepsByStep[stepOrder.step_id]
			if (!sampleNextSteps) {
				throw new Error(`Study samples for step ${stepOrder.step_id} not retrieved.`)
			}
			const samples = sampleNextSteps.map(nextStep => nextStep.sample)

			// Find the sample count for this step, if it is there. The backend returns nothing
			// if there are zero samples for a step.
			const sampleCountStep = sampleCounts?.steps.find(s => s.step_order_id === stepOrder.id)
			const completedStep = completedSampleCounts?.steps.find(s => s.step_order_id === stepOrder.id)

			const step : StudySampleStep = {
				stepID: stepOrder.step_id,
				stepName: stepOrder.step_name,
        		stepOrderID: stepOrder.id,
				stepOrder: stepOrder.order,
				protocolID: stepOrder.protocol_id,
				sampleCount: sampleCountStep ? sampleCountStep.count : 0,
				samples,
				completedCount: completedStep ? completedStep.count : 0, 
				completed: []
			}
			stepMap.set(step.stepOrderID, step)
		}
	}) 

	// Get the process measurements for the completed samples
	const processMeasurementIDs = completedSamplesByStudy.map(completed => completed.process_measurement)
	const processMeasurements = await fetchProcessMeasurements(processMeasurementIDs)
	const processMeasurementsByID = createItemsByID(processMeasurements)

	// Get the processes for the completed samples
	const processIDs = processMeasurements.map(pm => pm.process)
	const processes = await fetchProcesses(processIDs)
	const processesByID = createItemsByID(processes)

	// Get the user ID's for the processes
	const userIDs = processes.map(process => process.created_by)
	const users = await fetchUsers(userIDs)
	const usersByID = createItemsByID(users)

	completedSamplesByStudy.forEach(stepHistory => {
		const step = stepMap.get(stepHistory.step_order)
		if (step) {
			const processMeasurement = processMeasurementsByID[stepHistory.process_measurement]
			const process = processMeasurement ? processesByID[processMeasurement.process] : undefined
			const user = process && process.created_by ? usersByID[process.created_by] : undefined
			
			const completedSample : CompletedStudySample = {
				id: stepHistory.id,
				sampleID: stepHistory.sample,
				generatedSampleID: processMeasurement?.child_sample,
				processID: processMeasurement?.process,
				processMeasurementID: stepHistory.process_measurement,
				executionDate: processMeasurement?.execution_date,
				executedBy: user?.username,
				comment: processMeasurement?.comment,
				removedFromWorkflow: stepHistory.workflow_action === 'DEQUEUE_SAMPLE'
			}
			step.completed.push(completedSample)
		}
	})

	// Return the steps in the step order
	const steps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder)

	return {
		steps
	}
}

export async function fetchSamplesAtStep(studyID: FMSId, stepID: FMSId) {

	const studySettingsByID = selectStudySettingsByID(store.getState())

	// Get the current set of filters and sort order from UX settings for study and step
	let options = {}
	const settings = studySettingsByID[studyID]?.stepSettings[stepID]
	if (settings) {
		const serializedFilters = settings.filters ? serializeFilterParamsWithDescriptions(settings.filters) : {}
		const ordering = settings.sortBy ? serializeSortByParams(settings.sortBy) : undefined
		options = {ordering, ...serializedFilters}
	}

	return store.dispatch(api.sampleNextStepByStudy.getStudySamplesForStep(studyID, stepID, options))
		.then(response => {
			if (response.data?.results) {
				return {
					stepID: stepID,
					sampleNextSteps: response.data.results as FMSSampleNextStepByStudy[]
				}
			} else {
				throw new Error('Failed to fetch study samples - no data in response.')
			}
		})
}