import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory } from "../../models/fms_api_models"
import { createItemsByID, Study, Workflow } from "../../models/frontend_models"
import store from "../../store"
import api from "../../utils/api"
import { fetchLibrariesForSamples, fetchProcesses, fetchProcessMeasurements, fetchSamples, fetchStudies, fetchUsers, fetchWorkflows } from "./cache"
import { CompletedStudySample, StudySampleList, StudySampleStep } from "./models"

enum StudySamplesErrorCode {
	DEPENDENCY_NOT_FOUND,
	DEPENDENCY_NOT_READY,
	FETCH_ERROR
}

export class StudySamplesError extends Error {

	constructor(public readonly code: StudySamplesErrorCode, message: string) {
		super(message)
	}
}

export async function loadStudySamples(studyID: FMSId) {
	
	const study = (await fetchStudies([studyID])).find(obj => obj.id === studyID)
	if(! study) {
		throw new StudySamplesError(StudySamplesErrorCode.DEPENDENCY_NOT_FOUND, `Study "${studyID}" not found.`)
	}
	if (study.isFetching) {
		throw new StudySamplesError(StudySamplesErrorCode.DEPENDENCY_NOT_READY, 'Cannot load study samples - study is still fetching.')
	}

	const workflow = (await fetchWorkflows([study.workflow_id])).find(wf => wf.id === study.workflow_id)
	if(! workflow) {
		throw new StudySamplesError(StudySamplesErrorCode.DEPENDENCY_NOT_FOUND, `Workflow "${study.workflow_id}" not found.`)
	}
	if (workflow.isFetching) {
		throw new StudySamplesError(StudySamplesErrorCode.DEPENDENCY_NOT_READY, `Cannot load study samples - workflow is still fetching`)
	}
	
	// Get the study samples
	// Get samples that are waiting to be processed by a step
	let sampleNextStepsByStudy : FMSSampleNextStepByStudy[] | undefined
	const sampleNextStepResponse = await store.dispatch(api.sampleNextStepByStudy.getStudySamples(studyID))
	if (sampleNextStepResponse.data.results) {
		sampleNextStepsByStudy = sampleNextStepResponse.data.results as FMSSampleNextStepByStudy[]
	} else {
		throw new StudySamplesError(StudySamplesErrorCode.FETCH_ERROR, 'Failed to fetch study samples')
	}

	// Get samples that have completed the process at a step
	let completedSamplesByStudy : FMSStepHistory[] | undefined
	const sampleHistoryResponse = await store.dispatch(api.stepHistory.getCompletedSamplesForStudy(studyID))
	if (sampleHistoryResponse.data.results) {
		completedSamplesByStudy = sampleHistoryResponse.data.results as FMSStepHistory[]
	} else {
		throw new StudySamplesError(StudySamplesErrorCode.FETCH_ERROR, 'Failed to fetch completed samples for study')
	}

	const studySamples = await buildStudySamplesFromWorkflow(study, workflow, sampleNextStepsByStudy, completedSamplesByStudy)

	// Fetch the study samples
	if (studySamples.sampleList.length > 0) {

		const samples = await fetchSamples(studySamples.sampleList)
		if (samples.length > 0) {
			const sampleIDs = samples.filter(sample => sample.is_library).map(sample => sample.id)
			await fetchLibrariesForSamples(sampleIDs)
		}
	}
	return studySamples
}

export async function buildStudySamplesFromWorkflow(
	study: Study, 
	workflow: Workflow, 
	sampleNextStepsByStudy: FMSSampleNextStepByStudy[],
	completedSamplesByStudy: FMSStepHistory[]) : Promise<StudySampleList> {

	const sampleList : FMSId[] = []
	const stepMap = new Map<FMSId, StudySampleStep>()

	// Create the list of study steps from the workflow, starting and ending at the steps defined in the study.
	workflow.steps_order.forEach(stepOrder => {
		if (stepOrder.order >= study.start && stepOrder.order <= study.end) {
			const step : StudySampleStep = {
				stepID: stepOrder.step_id,
				stepName: stepOrder.step_name,
        		stepOrderID: stepOrder.id,
				stepOrder: stepOrder.order,
				protocolID: stepOrder.protocol_id,
				samples: [],
				completed: []
			}
			stepMap.set(step.stepOrderID, step)
		}
	}) 

	// Insert the sample ID's into the steps
	sampleNextStepsByStudy.forEach(sampleNextStepByStudy => {
		// Add the sample ID to the study samples step.
		// If the step doesn't exist in the workflow then ignore the sample next step.
		const step = stepMap.get(sampleNextStepByStudy.step_order)
		if (step) {
			step.samples.push(sampleNextStepByStudy.sample)
			sampleList.push(sampleNextStepByStudy.sample)
		} else {
			console.warn(`A study sample was ignored (ID: ${sampleNextStepByStudy.sample}). It is at step order (ID: ${sampleNextStepByStudy.step_order}) which is not in the study's ${workflow.name} workflow.`)
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
				comment: processMeasurement?.comment
			}
			step.completed.push(completedSample)

			sampleList.push(stepHistory.sample)
		}
	})

	// Return the steps in the step order
	const steps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder)

	return {
		sampleList,
		steps
	}
}