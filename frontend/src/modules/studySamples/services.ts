import { SampleAndLibrary } from "../../components/WorkflowSamplesTable/ColumnSets"
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/pagedItemsTable/serializeFilterParamsTS"
import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory, WorkflowStepOrder, WorkflowActionType } from "../../models/fms_api_models"
import { createItemsByID } from "../../models/frontend_models"
import { selectLibrariesByID, selectSamplesByID, selectStudiesByID, selectStudySettingsByID, selectStudyTableStatesByID, selectWorkflowsByID } from "../../selectors"
import store from "../../store"
import api from "../../utils/api"
import { fetchLibrariesForSamples, fetchProcessMeasurements, fetchProcesses, fetchSamples, fetchStudies, fetchUsers, fetchWorkflows } from "../cache/cache"
import { CompletedStudySample, StudySampleStep } from "./models"

export async function loadStudySamplesInStepByStudy(studyID: FMSId, stepOrderID: FMSId): Promise<Pick<StudySampleStep, 'ready' | 'completed' | 'removed'>> {
	// this will always be 10 anyway due it being the default in the setting
	const limit = selectStudySettingsByID(store.getState())[studyID]?.stepSettings[stepOrderID]?.pageSize ?? 10

	const studyTableStatesByID = selectStudyTableStatesByID(store.getState())
	const table = studyTableStatesByID[studyID]?.steps[stepOrderID]?.tables

	// Each step has its own samples table, with its own filters and sort order, so  we have to request samples for each step separately.
	let offset = limit * ((table?.ready.pageNumber ?? 1) - 1)
	const fetchSamplesAtStepOrderResponse = await fetchSamplesAtStepOrder(studyID, stepOrderID, offset, limit)
	const { sampleNextSteps, count: readyCount } = fetchSamplesAtStepOrderResponse
	const readySamples = await fetchSamplesAndLibraries(sampleNextSteps.map((s) => s.sample))
	
	// Get samples that have completed the process at a step
	offset = limit * ((table?.completed.pageNumber ?? 1) - 1)
	const { result: completedSamples, count: completedCount } = await fetchCompletedSamples(studyID, stepOrderID, 'NEXT_STEP', limit, offset)

	// Get samples that have been dequeued at a step
	offset = limit * ((table?.removed.pageNumber ?? 1) - 1)
	const { result: dequeuedSamples, count: dequeuedCount} = await fetchCompletedSamples(studyID, stepOrderID, 'DEQUEUE_SAMPLE', limit, offset)

	return {
		ready: {
			samples: readySamples,
			count: readyCount,
			sampleNextStepByID: sampleNextSteps.reduce((sampleNextStepByID, sampleNextStep) => {
				sampleNextStepByID[sampleNextStep.sample] = sampleNextStep.id
				return sampleNextStepByID
			}, {} as StudySampleStep['ready']['sampleNextStepByID'])
		},
		completed: { samples: completedSamples, count: completedCount ?? 0 },
		removed: { samples: dequeuedSamples, count: dequeuedCount ?? 0 },
	}
}

// should be called after initStudySamplesSettings
export async function loadStudySampleStep(studyID: FMSId, stepOrder: WorkflowStepOrder): Promise<StudySampleStep> {
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

	return {
		stepID: stepOrder.step_id,
		stepName: stepOrder.step_name,
		stepOrderID: stepOrder.id,
		stepOrder: stepOrder.order,
		protocolID: stepOrder.protocol_id,
		...(await loadStudySamplesInStepByStudy(studyID, stepOrder.id))
	}
}

async function fetchSamplesAndLibraries(sampleList: number[]) {
	if (sampleList.length > 0) {
		const samples = await fetchSamples(sampleList)
		if (samples.length > 0) {
			const sampleIDs = samples.filter(sample => sample.is_library).map(sample => sample.id)
			await fetchLibrariesForSamples(sampleIDs)
		}
	}

	const samplesByID = selectSamplesByID(store.getState())
	const librariesByID = selectLibrariesByID(store.getState())

	const availableSamples = sampleList.reduce((availableSamples, s) => {
		const sample = samplesByID[s]
		if (sample) {
			if (sample.is_library) {
				const library = librariesByID[s]
				availableSamples.push({ sample, library })
			} else {
				availableSamples.push({ sample })
			}
		}
		return availableSamples
	}, [] as SampleAndLibrary[])

	return availableSamples
}

export async function fetchCompletedSamples(studyID: FMSId, stepOrderID: FMSId, workflow_action: WorkflowActionType, limit: number, offset: number) {
	const stepHistoryResponse = await store.dispatch(api.stepHistory.getCompletedSamplesForStudy(studyID, {step_order__id__in: stepOrderID, limit, offset, workflow_action}))
	if (!stepHistoryResponse.data) {
		throw new Error(`Failed to fetch completed samples for study #${studyID} and step_order #${stepOrderID}`)
	}
	const completedSamples: FMSStepHistory[] = stepHistoryResponse.data.results ?? []
	const totalCount = stepHistoryResponse.data.count ?? 0

	// Get the process measurements for the completed samples
	const processMeasurementIDs = completedSamples.map(completed => completed.process_measurement)
	const processMeasurements = await fetchProcessMeasurements(processMeasurementIDs)
	const processMeasurementsByID = createItemsByID(processMeasurements)

	// Get the processes for the completed samples
	const processIDs = processMeasurements.map(pm => pm.process)
	const processes = await fetchProcesses(processIDs)
	const processesByID = createItemsByID(processes)

	// Get the user ID's for the processes
	const processesUserIDs = processes.map(process => process.created_by)

	// Get the user ID's for the step history without processes
	const userIDs = processesUserIDs
	const users = await fetchUsers(userIDs)
	const usersByID = createItemsByID(users)

	const completedStudySamples = completedSamples.map((completedSample) => {
		const processMeasurement = processMeasurementsByID[completedSample.process_measurement]
		const process = processMeasurement ? processesByID[processMeasurement.process] : undefined
		const user = process && process.created_by ? usersByID[process.created_by] : completedSample.created_by ? usersByID[completedSample.created_by] : undefined

		return {
			id: completedSample.id,
			sampleID: completedSample.sample,
			generatedSampleID: processMeasurement?.child_sample,
			processID: processMeasurement?.process,
			processMeasurementID: completedSample.process_measurement,
			executionDate: processMeasurement ? processMeasurement?.execution_date : timestampStringAsDate(completedSample.created_at),
			executedBy: user?.username,
			comment: processMeasurement?.comment,
		} as CompletedStudySample
	})

	return {
		result: completedStudySamples,
		count: totalCount
	}
}

export async function fetchSamplesAtStepOrder(studyID: FMSId, stepOrderID: number, offset = 0, limit = 10) {
	const studySettingsByID = selectStudySettingsByID(store.getState())

	// Get the current set of filters and sort order from UX settings for study and step
	let options = { limit } as any
	const settings = studySettingsByID[studyID]?.stepSettings[stepOrderID]
	if (settings) {
		const serializedFilters = settings.filters ? serializeFilterParamsWithDescriptions(settings.filters) : {}
		const ordering = settings.sortBy ? serializeSortByParams(settings.sortBy) : undefined
		const limit = settings.pageSize
		options = {...options, ordering, limit, ...serializedFilters}
	}

	return store.dispatch(api.sampleNextStepByStudy.getStudySamplesForStepOrder(studyID, stepOrderID, {...options, offset}))
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

function timestampStringAsDate(created_at: string): any {
	throw new Error("Function not implemented.")
}
