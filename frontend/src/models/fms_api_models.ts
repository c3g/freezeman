/**
 * Type definitions for the objects returned by the freezeman API.
 */

//
type FMSId = number

interface FMSTrackedModel {
    id: FMSId
    created_at: Date
    created_by: FMSId
    updated_at: Date
    updated_by: FMSId
    deleted: boolean
}

/**
 * Freezeman project model
 */
export interface FMSProject extends FMSTrackedModel {
    // The name of the project
    name: string
    // The principal investigator of the project
    principal_investigator: string
    // The principal investigator of the project
    requestor_name: string
    // The email of the requestor of the project
    requestor_email: string
    // Targeted date to conclude the project
    targeted_end_date?: Date
    // The status of the project (open or closed)
    status: 'Open' | 'Closed'
    // Identifier to connect to an external system (eg. Hercules)
    external_id?: FMSId
    // Original project name used by external client
    external_name?: string
    // Other relevant information about the project
    comment: string
}



export interface FMSReferenceGenome extends FMSTrackedModel {
    // Assembly name of the reference genome
    assembly_name: string
    // Other name of the reference genome
    synonym?: string
    // GenBank accession number of the reference genome
    genbank_id?: string
    // RefSeq identifier of the reference genome
    refseq_id?: string
    // Reference genome used to analyze samples in the study
    taxon: FMSId
    // Number of base pairs of the reference genome
    size: number
}

export interface FMSStudy extends FMSTrackedModel {
    name: string
    reference_genome: FMSId
    workflow: FMSId
}

export interface FMSTaxon extends FMSTrackedModel {
    // Taxon scientific name
    name: string
    // Numerical identifier used by the NCBI taxonomy catalog
    ncbi_id: number
}

export interface FMSWorkflow extends FMSTrackedModel {
    // Workflow name
    name: string
    // Workflow structure
    structure: string
    // Workflow steps
    steps: WorkflowStep[]
}

export interface WorkflowStep extends FMSTrackedModel {
    // Step name
    name: string
}
