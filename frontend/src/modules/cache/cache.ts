import { Dispatch } from "redux"
import { FMSId, FMSTrackedModel } from "../../models/fms_api_models"
import { Container, ItemsByID, Library, Process, ProcessMeasurement, PropertyValue, Readset, Sample, Study, User, Workflow } from "../../models/frontend_models"
import { selectContainersByID, selectLibrariesByID, selectProcessMeasurementsByID, selectProcessesByID, selectPropertyValuesByID, selectSamplesByID, selectStudiesByID, selectUsersByID, selectWorkflowsByID } from "../../selectors"
import store from "../../store"
import { list as listContainers } from '../containers/actions'
import { listPropertyValues } from "../experimentRuns/actions"
import { list as listLibraries } from '../libraries/actions'
import { list as listProcessMeasurements } from "../processMeasurements/actions"
import { list as listProcesses } from "../processes/actions"
import { list as listSamples } from "../samples/actions"
import { list as listStudies } from '../studies/actions'
import { list as listUsers } from "../users/actions"
import { list as listWorkflows } from '../workflows/actions'
import { isDefined } from "../../utils/functions"


type ListOptions = { [key: string]: any }
interface ListPagedOptions extends ListOptions {
	offset: number
	limit: number
}

type ListPagedReturnType<T> = { results: T[], count: number }
type ListReturnType<T> = ListPagedReturnType<T> | T[]
type ListFunction<T> = (options: ListOptions | ListPagedOptions) => (dispatch: Dispatch, getState: () => any) => Promise<ListReturnType<T>>

function isResultPaged<T>(result: ListReturnType<T>): result is ListPagedReturnType<T> {
	const r = (result as ListPagedReturnType<T>)
	return isDefined(r.count) && isDefined(r.results)
}

function isResultAnArray<T>(result: ListReturnType<T>): result is T[] {
	return Array.isArray(result)
}

function createFetchItemsByID<ItemType extends FMSTrackedModel>(
	itemsByIDSelector: (state: any) => ItemsByID<ItemType>,
	listFunc: ListFunction<ItemType>
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
			const BATCH_SIZE = 100
			const totalBatch = Math.ceil(itemsToFetch.length / BATCH_SIZE)

			const batchActions: Promise<ListReturnType<ItemType>>[] = []
			for (let batchNum = 0; batchNum < totalBatch; batchNum++) {
				const offset = batchNum*BATCH_SIZE
				const id__in = itemsToFetch.slice(offset, offset + BATCH_SIZE).join(",")
				batchActions.push(store.dispatch(listFunc({ id__in })))
			}

			const replies = await Promise.all(batchActions)
			for (const reply of replies) {
				// Some 'list' endpoints return paginated results, with a count and the data
				// in a 'results' field. Others just return an array of data objects directly,
				// so we have to distinguish between the two types of response. Any other type
				// of response is an error.
				if (isResultPaged(reply)) {
					fetchedItems.push(...reply.results)
				} else if (isResultAnArray(reply)) {
					fetchedItems.push(...reply)
				} else {
					console.error('Cache received unsupported reply from a list api call', JSON.stringify(reply))
					throw new Error('Cache received unexpected reply from list api call')
				}
			}
		}

		return fetchedItems
	}

	return fetchItemsByID
}

export const fetchContainers = createFetchItemsByID<Container>(selectContainersByID, listContainers)
export const fetchLibraries = createFetchItemsByID<Library>(selectLibrariesByID, listLibraries)
export const fetchLibrariesForSamples = createFetchItemsByID<Library>(selectLibrariesByID, listLibraries)
export const fetchProcesses = createFetchItemsByID<Process>(selectProcessesByID, listProcesses)
export const fetchProcessMeasurements = createFetchItemsByID<ProcessMeasurement>(selectProcessMeasurementsByID, listProcessMeasurements)
export const fetchPropertyValues = createFetchItemsByID<PropertyValue>(selectPropertyValuesByID, listPropertyValues)
export const fetchSamples = createFetchItemsByID<Sample>(selectSamplesByID, listSamples)
export const fetchStudies = createFetchItemsByID<Study>(selectStudiesByID, listStudies)
export const fetchUsers = createFetchItemsByID<User>(selectUsersByID, listUsers)
export const fetchWorkflows = createFetchItemsByID<Workflow>(selectWorkflowsByID, listWorkflows)
