/**
 * Interface definitions for the types used in the frontend, especially
 * types of objects stored in redux, which may not match exactly what is
 * received from api endpoints.
 *
 * UX code should use these models. FMS models should only be needed by
 * code that handles api responses.
 */

import {
	FMSContainer,
	FMSId,
	FMSImportedFile,
	FMSIndex,
	FMSIndividual,
	FMSLibrary,
	FMSLibraryType,
	FMSPlatform,
	FMSPooledSample,
	FMSProject,
	FMSReferenceGenome,
	FMSSample,
	FMSSequence,
	FMSStudy,
	FMSTaxon,
	FMSUser,
	FMSWorkflow,
} from './fms_api_models'

// Reducers tack on these two properties to objects that are fetched from
// the backend when they add the objects to the store.
export interface FetchedObject {
	isFetching: boolean
	isLoaded: boolean
}

export interface ItemsByID<T extends FetchedObject> {
	[key: FMSId]: T
}

export type ObjectId = FMSId
export interface Container extends FMSContainer, FetchedObject {}
export interface ImportedFile extends FMSImportedFile, FetchedObject {}
export interface Index extends FMSIndex, FetchedObject {}
export interface Individual extends FMSIndividual, FetchedObject {}
export interface Library extends FMSLibrary, FetchedObject {}
export interface LibraryType extends FMSLibraryType, FetchedObject {}
export interface Platform extends FMSPlatform, FetchedObject {}
export interface PooledSample extends FMSPooledSample, FetchedObject {}
export interface Project extends FMSProject, FetchedObject {}
export interface ReferenceGenome extends FMSReferenceGenome, FetchedObject {}
export interface Sample extends FMSSample, FetchedObject {}
export interface Sequence extends FMSSequence, FetchedObject {}
export interface Study extends FMSStudy, FetchedObject {}
export interface Taxon extends FMSTaxon, FetchedObject {}
export interface User extends FMSUser, FetchedObject {}
export interface Workflow extends FMSWorkflow, FetchedObject {}

export interface WorkflowStepRange {
	start: number
	end: number
}
