/**
 * Interface definitions for the types used in the frontend, especially
 * types of objects stored in redux, which may not match exactly what is
 * received from api endpoints.
 * 
 * UX code should use these models. FMS models should only be needed by
 * code that handles api responses.
 */

import { FMSId, FMSProject, FMSReferenceGenome, FMSTaxon, FMSWorkflow } from "./fms_api_models"

// Reducers tack on these two properties to objects that are fetched from
// the backend when they add the objects to the store.
interface FetchedObject {
    isFetching: boolean
    isLoaded: boolean
}

export type ObjectId= FMSId
export interface Project extends FMSProject, FetchedObject {}
export interface ReferenceGenome extends FMSReferenceGenome, FetchedObject {}
export interface Taxon extends FMSTaxon, FetchedObject {}
export interface Workflow extends FMSWorkflow, FetchedObject {}