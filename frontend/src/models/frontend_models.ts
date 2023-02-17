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
	FMSProtocol,
	FMSReferenceGenome,
	FMSSample,
	FMSSampleKind,
	FMSSampleNextStep,
	FMSSequence,
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
	isLoaded: boolean
}

export interface ItemsByID<T extends FMSTrackedModel> {
	[key: FMSId]: T
}

export function createItemsByID<T extends FMSTrackedModel>(items: T[]) : ItemsByID<T> {
	const itemsByID : ItemsByID<T> = {}
	items.forEach(item => {
		itemsByID[item.id] = item
	})
	return items
}


export interface PagedItems<T extends FMSTrackedModel> {
	isFetching: boolean
	error?: any
	itemsByID: ItemsByID<T>
	items: FMSId[]
	totalCount: number
	filters: {
		[key : string] : {
			value: string | {
				min?: string | number
				max?: string | number
			}
			options?: {
				exactMatch?: boolean
				recursiveMatch?: boolean
			}
		}
	}
	sortBy: {
		key?: string
		order?: 'ascend' | 'descend'
	}
	page?: {
		pageNumber?: number		// Move to using page number instead of offset
		offset?: number
		limit?: number
		ignoreError?: string
	}
}


export type ObjectId = FMSId
export interface Container extends Readonly<FMSContainer>, FetchedObject {}
export interface ImportedFile extends Readonly<FMSImportedFile>, FetchedObject {}
export interface Index extends Readonly<FMSIndex>, FetchedObject {}
export interface Individual extends Readonly<FMSIndividual>, FetchedObject {}
export interface Library extends Readonly<FMSLibrary>, FetchedObject {}
export interface LibraryType extends Readonly<FMSLibraryType>, FetchedObject {}
export interface Platform extends Readonly<FMSPlatform>, FetchedObject {}
export interface PooledSample extends Readonly<FMSPooledSample>, FetchedObject {}
export interface Project extends Readonly<FMSProject>, FetchedObject {}
export interface Protocol extends Readonly<FMSProtocol>, FetchedObject {}
export interface ReferenceGenome extends Readonly<FMSReferenceGenome>, FetchedObject {}
export interface Sample extends Readonly<FMSSample>, FetchedObject {}
export interface SampleKind extends Readonly<FMSSampleKind>, FetchedObject {}
export interface SampleNextStep extends Readonly<FMSSampleNextStep>, FetchedObject {}
export interface Sequence extends Readonly<FMSSequence>, FetchedObject {}
export interface Study extends Readonly<FMSStudy>, FetchedObject {}
export interface Taxon extends Readonly<FMSTaxon>, FetchedObject {}
export interface User extends Readonly<FMSUser>, FetchedObject {}
export interface Workflow extends Readonly<FMSWorkflow>, FetchedObject {}

export interface WorkflowStepRange {
	start: number
	end: number
}
