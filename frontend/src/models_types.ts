
type FMSId = number

interface FreezemanObjectModel {
    id: FMSId
    created_at: Date
    created_by: FMSId
    updated_at: Date
    updated_by: FMSId
    deleted: boolean
}

interface FetchedObject {
    isFetching: boolean
    isLoaded: boolean
}
/**
 * Freezeman project model
 */
export interface Project extends FreezemanObjectModel, FetchedObject {
    name: string
    principal_investigator?: string
    requestor_name?: string
    requestor_email?: string
    targeted_end_date?: Date
    status: 'Open' | 'Closed'
    external_id?: FMSId
    external_name?: string
    comment?: string
}

/**
 * Freezeman study model
 */
export interface Study extends FreezemanObjectModel, FetchedObject {
    name: string
    reference_genome: FMSId
    workflow: FMSId
}