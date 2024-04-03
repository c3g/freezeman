/**
 * Interface definitions for the types used in the frontend, especially
 * types of objects stored in redux, which may not match exactly what is
 * received from api endpoints.
 *
 * UX code should use these models. FMS models should only be needed by
 * code that handles api responses.
 */

import {
  FMSArchivedComment,
	FMSContainer,
	FMSCoordinate,
	FMSDataset,
	FMSDatasetFile,
	FMSExperimentRun,
	FMSExternalExperimentRun,
	FMSId,
	FMSImportedFile,
	FMSIndex,
	FMSIndividual,
	FMSInstrument,
	FMSInstrumentType,
	FMSLibrary,
	FMSLibraryType,
	FMSPlatform,
	FMSPooledSample,
	FMSProcess,
	FMSProcessMeasurement,
	FMSProject,
	FMSPropertyValue,
	FMSProtocol,
	FMSReadset,
	FMSReferenceGenome,
	FMSRunType,
	FMSSample,
	FMSSampleKind,
	FMSSampleNextStep,
	FMSSequence,
	FMSStep,
	FMSStudy,
	FMSTaxon,
	FMSTrackedModel,
	FMSUser,
	FMSWorkflow,
} from './fms_api_models'

// Reducers tack on these two properties to objects that are fetched from
// the backend when they add the objects to the store.
export interface FetchedObject {
	isFetching: boolean
	isRemoving: boolean
	isLoaded: boolean
	error?: any
	didFail?: boolean
}

export interface ItemsByID<T extends FMSTrackedModel> {
	[key: FMSId]: T
}

export function preprocess<T extends FetchedObject>(object: any): T {
	const processedObject: T = {
		...object,
		isFetching: false,
		isLoaded: true,
	}
	return processedObject;
}

/**
 * Generates an ItemsByID object from an array of model objects.
 * @param items Array of model objects
 * @returns ItemsByID
 */
export function createItemsByID<T extends FMSTrackedModel>(items: T[]): ItemsByID<T> {
	const itemsByID: ItemsByID<T> = {}
	items.forEach(item => {
		itemsByID[item.id] = item
	})
	return itemsByID
}

/**
 * Gets all of the items from an ItemsByID object, as an array.
 * @param itemsByID An ItemsByID object
 * @returns The array of items contained in the ItemsByID object
 */
export function getAllItems<T extends FMSTrackedModel>(itemsByID: ItemsByID<T>): T[] {
	return Object.values(itemsByID) as T[]
}

/**
 * Merge a new list of items into an ItemsByID object.
 * @param itemsByID 
 * @param items 
 * @returns 
 */
export function mergeItemsByID<T extends FMSTrackedModel>(itemsByID: ItemsByID<T>, items: T[]) {
	const merged = {...itemsByID}
	items.forEach(item => {
		if (item) {
			merged[item.id] = item
		}
	})
	return merged
}

export type ObjectId = FMSId
export interface Container extends Readonly<FMSContainer>, FetchedObject {
	parents?: Array<Container["id"]>
}
export interface Coordinate extends Readonly<FMSCoordinate>, FetchedObject {}
export interface Dataset extends Readonly<FMSDataset>, FetchedObject {}
export interface DatasetFile extends Readonly<FMSDatasetFile>, FetchedObject {}
export interface ExperimentRun extends Readonly<FMSExperimentRun>, FetchedObject {}
export interface ExternalExperimentRun extends Readonly<FMSExternalExperimentRun>, FetchedObject {}
export interface ImportedFile extends Readonly<FMSImportedFile>, FetchedObject {}
export interface Index extends Readonly<FMSIndex>, FetchedObject {}
export interface Individual extends Readonly<FMSIndividual>, FetchedObject {}
export interface Instrument extends Readonly<FMSInstrument>, FetchedObject {}
export interface InstrumentType extends Readonly<FMSInstrumentType>, FetchedObject {}
export interface Library extends Readonly<FMSLibrary>, FetchedObject {}
export interface LibraryType extends Readonly<FMSLibraryType>, FetchedObject {}
export interface Platform extends Readonly<FMSPlatform>, FetchedObject {}
export interface PooledSample extends Readonly<FMSPooledSample>, FetchedObject {}
export interface Process extends Readonly<FMSProcess>, FetchedObject {}
export interface ProcessMeasurement extends Readonly<FMSProcessMeasurement>, FetchedObject {}
export interface Project extends Readonly<FMSProject>, FetchedObject {}
export interface PropertyValue extends Readonly<FMSPropertyValue>, FetchedObject {}
export interface Protocol extends Readonly<FMSProtocol>, FetchedObject {}
export interface ReferenceGenome extends Readonly<FMSReferenceGenome>, FetchedObject {}
export interface RunType extends Readonly<FMSRunType>, FetchedObject {}
export interface Readset extends Readonly<FMSReadset>, FetchedObject {}
export interface Sample extends Readonly<FMSSample>, FetchedObject {}
export interface SampleKind extends Readonly<FMSSampleKind>, FetchedObject {}
export interface SampleNextStep extends Readonly<FMSSampleNextStep>, FetchedObject {}
export interface Sequence extends Readonly<FMSSequence>, FetchedObject {}
export interface Step extends Readonly<FMSStep> {}
export interface Study extends Readonly<FMSStudy>, FetchedObject {}
export interface Taxon extends Readonly<FMSTaxon>, FetchedObject {}
export interface User extends Readonly<FMSUser>, FetchedObject {}
export interface Workflow extends Readonly<FMSWorkflow>, FetchedObject {}

export interface WorkflowStepRange {
	start: number
	end: number
}
