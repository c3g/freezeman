import { SampleAndLibrary } from "../../components/WorkflowSamplesTable/ColumnSets"
import serializeFilterParamsWithDescriptions, { serializeSortByParams } from "../../components/pagedItemsTable/serializeFilterParamsTS"
import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory, WorkflowStepOrder, WorkflowActionType } from "../../models/fms_api_models"
import { createItemsByID } from "../../models/frontend_models"
import { selectLibrariesByID, selectSamplesByID, selectStudySettingsByID, selectStudyTableStatesByID } from "../../selectors"
import store from "../../store"
import api from "../../utils/api"
import { fetchLibrariesForSamples, fetchProcessMeasurements, fetchProcesses, fetchSamples, fetchStudies, fetchUsers, fetchWorkflows } from "../cache/cache"
import { CompletedStudySample, StudySampleStep } from "./models"
import { timestampStringAsDate } from "../../utils/humanReadableTime"

export async function loadStudySamplesInStepByStudy(studyID: FMSId, stepOrderID: FMSId, limit: number): Promise<Pick<StudySampleStep, 'ready' | 'completed' | 'removed'>> {
	const studyTableStatesByID = selectStudyTableStatesByID(store.getState())
	const table = studyTableStatesByID[studyID]?.steps[stepOrderID]?.tables

	const lazy = lazyLoadStudySamplesInStepByStudy(studyID, stepOrderID)
	const results = await Promise.all([
		lazy.ready(((table?.ready.pageNumber ?? 1) - 1) * limit, limit),
		lazy.completed(((table?.completed.pageNumber ?? 1) - 1) * limit, limit),
		lazy.removed(((table?.removed.pageNumber ?? 1) - 1) * limit, limit)
	])
	return {
		ready: results[0],
		completed: results[1],
		removed: results[2]
	}
}

export function lazyLoadStudySamplesInStepByStudy(studyID: FMSId, stepOrderID: FMSId) {
	return {
		ready: async (offset: number, limit: number) => {
			const fetchSamplesAtStepOrderResponse = await fetchSamplesAtStepOrder(studyID, stepOrderID, offset, limit)
			const { sampleNextSteps, count: readyCount } = fetchSamplesAtStepOrderResponse
			const readySamples = await fetchSamplesAndLibraries(sampleNextSteps.map((s) => s.sample))

			return {
				samples: readySamples,
				count: readyCount,
				sampleNextStepByID: sampleNextSteps.reduce((sampleNextStepByID, sampleNextStep) => {
					sampleNextStepByID[sampleNextStep.sample] = sampleNextStep.id
					return sampleNextStepByID
				}, {} as StudySampleStep['ready']['sampleNextStepByID'])
			}
		},
		completed: async (offset: number, limit: number) => {
			const { result: completedSamples, count: completedCount } = await fetchCompletedSamples(studyID, stepOrderID, ['NEXT_STEP',  'REPEAT_STEP'], limit, offset)
			return { samples: completedSamples, count: completedCount }
		},
		removed: async (offset: number, limit: number) => {
			const { result: dequeuedSamples, count: dequeuedCount} = await fetchCompletedSamples(studyID, stepOrderID, ['DEQUEUE_SAMPLE'], limit, offset)
			return { samples: dequeuedSamples, count: dequeuedCount ?? 0 }
		}
	}
}

// should be called after initStudySamplesSettings
export async function loadStudySampleStep(studyID: FMSId, stepOrder: WorkflowStepOrder, limit: number): Promise<StudySampleStep> {
	const study = (await fetchStudies([studyID])).find(obj => obj.id === studyID)
	if(! study) {
		throw new Error(`Study "${studyID}" not found.`)
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
		...(await loadStudySamplesInStepByStudy(studyID, stepOrder.id, limit))
	}
}

export async function fetchSamplesAndLibraries(sampleList: number[], forceFetch = false) {
	if (sampleList.length > 0 || forceFetch) {
		const samples = await fetchSamples(sampleList, false)
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

export async function fetchCompletedSamples(studyID: FMSId, stepOrderID: FMSId, workflow_actions: WorkflowActionType[], limit: number, offset: number) {
  const qsWorkflowActions = workflow_actions.join(" ")
	const stepHistoryResponse = await store.dispatch(api.stepHistory.getCompletedSamplesForStudy(studyID, {step_order__id__in: stepOrderID, limit, offset, workflow_action: qsWorkflowActions}))
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

async function fetchSamplesAtStepOrder(studyID: FMSId, stepOrderID: number, offset: number, limit: number) {
	const studySettingsByID = selectStudySettingsByID(store.getState())

	// Get the current set of filters and sort order from UX settings for study and step
	let options = {} as any
	const settings = studySettingsByID[studyID]?.stepSettings[stepOrderID]
	if (settings) {
		const serializedFilters = settings.filters ? serializeFilterParamsWithDescriptions(settings.filters) : {}
		const ordering = settings.sortBy ? serializeSortByParams(settings.sortBy) : undefined
		options = { ordering, ...serializedFilters}
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

