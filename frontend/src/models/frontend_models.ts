/**
 * Interface definitions for the types used in the frontend, especially
 * types of objects stored in redux, which may not match exactly what is
 * received from api endpoints.
 */

import { FMSProject } from "./fms_api_models"

// Reducers tack on these two properties to objects that are fetched from
// the backend when they add the objects to the store.
interface FetchedObject {
    isFetching: boolean
    isLoaded: boolean
}

// Actual model used by frontend
export interface Project extends FMSProject, FetchedObject {}