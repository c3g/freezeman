import { Dispatch } from "redux"
import { FMSId, FMSTrackedModel } from "../../models/fms_api_models"
import { Container, ItemsByID, Library, Process, ProcessMeasurement, PropertyValue, Sample, Study, User, Workflow } from "../../models/frontend_models"
import { selectContainersByID, selectLibrariesByID, selectProcessesByID, selectProcessMeasurementsByID, selectPropertyValuesByID, selectSamplesByID, selectStudiesByID, selectUsersByID, selectWorkflowsByID } from "../../selectors"
import store from "../../store"
import { listPropertyValues } from "../experimentRuns/actions"
import { list as listProcessMeasurements } from "../processMeasurements/actions"
import { list as listSamples } from "../samples/actions"
import { list as listProcesses } from "../processes/actions"
import { list as listUsers } from "../users/actions"
import { list as listLibraries } from '../libraries/actions'
import { list as listWorkflows } from '../workflows/actions'
import { list as listStudies } from '../studies/actions'
import { list as listContainers } from '../containers/actions'


type ListByIDFunction = (ids: FMSId[]) => (dispatch: Dispatch, getState: () => any) => Promise<any>

function createFetchItems<ItemType extends FMSTrackedModel>(
	itemsByIDSelector: (state: any) => ItemsByID<ItemType>,
	listByIDFunc: ListByIDFunction
) {

	async function fetchItemsByID(ids: FMSId[]): Promise<ItemType[]> {

		const fetchedItems: ItemType[] = []
 		const itemsByID: ItemsByID<ItemType> = itemsByIDSelector(store.getState())
		const itemsToFetch: FMSId[] = []

		for(const id of ids) {
			const item = itemsByID[id]
			if (item) {
				fetchedItems.push(item)
			} else {
				itemsToFetch.push(id)
			}
		}

		if (itemsToFetch.length > 0) {
			const reply = await store.dispatch(listByIDFunc(itemsToFetch))
			// Some 'list' endpoints return paginated results, with a count and the data
			// in a 'results' field. Others just return an array of data objects directly,
			// so we have to distinguish between the two types of response.
			if (reply.count && reply.results) {
				fetchedItems.push(...reply.results)
			} else {
				fetchedItems.push(...reply)
			}
			
		}

		return fetchedItems
	}

	return fetchItemsByID
}

function id__in(ids: FMSId[]) {
	return {
		id__in: ids.join(',')
	}
}

export const fetchContainers = createFetchItems<Container>(selectContainersByID, ids => {
	const options = id__in(ids)
	return listContainers(options)
})

export const fetchLibraries = createFetchItems<Library>(selectLibrariesByID, ids => {
	const options = id__in(ids)
	return listLibraries(options)
})

export const fetchLibrariesForSamples = createFetchItems<Library>(selectLibrariesByID, ids => {
	const options = {
		'sample__id__in': ids.join(',')
	}
	return listLibraries(options)
})

export const fetchProcesses = createFetchItems<Process>(selectProcessesByID, ids => {
	const options = id__in(ids)
	return listProcesses(options)
})

export const fetchProcessMeasurements = createFetchItems<ProcessMeasurement>(selectProcessMeasurementsByID, ids => {
	const options = id__in(ids)
	return listProcessMeasurements(options)
})

export const fetchPropertyValues = createFetchItems<PropertyValue>(selectPropertyValuesByID, ids => {
	const options = id__in(ids)
	return listPropertyValues(options)
})

export const fetchSamples = createFetchItems<Sample>(selectSamplesByID, ids => {
	const options = id__in(ids)
	return listSamples(options)
})

export const fetchStudies = createFetchItems<Study>(selectStudiesByID, ids => {
	const options = id__in(ids)
	return listStudies(options)
})

export const fetchUsers = createFetchItems<User>(selectUsersByID, ids => {
	const options = id__in(ids)
	return listUsers(options)
})

export const fetchWorkflows = createFetchItems<Workflow>(selectWorkflowsByID, ids => {
	const options = id__in(ids)
	return listWorkflows(options)
})


