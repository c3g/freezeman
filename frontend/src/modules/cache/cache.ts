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
import { FilterSet, SortBy } from "../../models/paged_items"


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
	return r.count !== undefined && r.results !== undefined
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
			const batchNumbers = [...Array(totalBatch).keys()]
			const batchActions = batchNumbers.map((batchNum) => (async () => {
					const offset = batchNum*BATCH_SIZE
					const id__in = itemsToFetch.slice(offset, offset + BATCH_SIZE).join(",")
					return await store.dispatch(listFunc({ id__in }))
				})())

			for (const bathAction of batchActions) {
				const reply = await bathAction
				// Some 'list' endpoints return paginated results, with a count and the data
				// in a 'results' field. Others just return an array of data objects directly,
				// so we have to distinguish between the two types of response.
				if (isResultPaged(reply)) {
					fetchedItems.push(...reply.results)
				} else {
					fetchedItems.push(...reply)
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
