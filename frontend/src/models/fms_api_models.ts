/**
 * Type definitions for the objects returned by the freezeman API.
 * 
 * These are the types we receive in response to api calls. The frontend
 * then tacks on some extra properties before storing the objects in
 * the redux state (isFetching and isLoaded). The actual types stored in redux
 * are defined in `frontend_models.ts`.
 */

/* Error type returned by the API when the frontend sends a bad request (error 400) */
export interface ApiError {
	data: {[key: string]: string[]} // Key-value pair, where the value is an array of error messages
	fromAPI: boolean
	name: string
	status: number
	statusText: string
    url: string
	message: string
}

export function isApiError(err : any): boolean {
    return (err && err.fromAPI === true && err.name === 'APIError' && err.status === 400) 
}

export function mapToFMSId(value: string | number) {
    if (typeof(value) === 'string') {
        value = parseInt(value)
    }
    return value
}

//
export type FMSId = number

interface FMSTrackedModel {
    id: FMSId                           // Unique ID of object in database
    created_at: string                  // Timestamp object was created (eg. "2020-05-22T19:29:44.578672Z")
    created_by: FMSId                   // ID of user that created object
    updated_at: string                  // Timestamp of last update to object (eg. "2020-05-22T19:29:44.578672Z")
    updated_by: FMSId                   // ID of user that updated object
    deleted: boolean                    // Soft delete flag
}

export interface FMSContainer extends FMSTrackedModel {
    kind: string                        // The type of container (eg. 96-well-plate)
    name: string                        // Container name
    barcode: string                     // Container barcode
    coordinates: string                 // Coordinates of this container in it's parent container (eg "A01")
    comment: string                     // User comment
    update_comment: string              // User update comment
    location?: FMSId                    // ID of parent container (if any)
    children: FMSId[]                   // ID's of child containers, contained by this container
    samples: FMSId[]                    // ID's of samples contained in the container
    experiment_run?: FMSId              // Experiment run associate with the container (if any)
}

export interface FMSImportedFile {
    filename: string,                   // Name of file 
    location: string,                   // Path to file (including file name)
  }

export interface FMSIndex extends FMSTrackedModel {
    name: string                        // eg "Index_1"
    index_set: string                   // IndexSet name
    index_structure: string             // IndexStructure name
    sequences_3prime: FMSId[]           // Sequence ID's
    sequences_5prime: FMSId[]           // Sequence ID's
}

export interface FMSIndividual extends FMSTrackedModel {
    name: string                        // Indivual's name
    sex: 'M' | 'F' | 'Unknown'          // Sex
    pedigree: string                    // Pedigree (can be empty string)
    cohort: string                      // Cohort (can be empty string)
    alias?: string                      // Alternative name for individual
    taxon: FMSId                        // Taxon ID
    reference_genome?: FMSId            // Reference Genome ID
    mother?: FMSId                      // Individual ID of mother
    father?: FMSId                      // Individual ID of father
}

export interface FMSLabworkSummary {
    protocols: {[key: string] : FMSLabworkProtocol}  // key: protocol object ID
}

export interface FMSLabworkProtocol {
    name: string                        // Name of protocol
    count: number                       // Total number of samples waiting for protocol
    steps: FMSLabworkStep[]      // The steps based on the protocol which have at least one sample waiting
}

export interface FMSLabworkStep {
    name: string
    count: number
    step_specifications: FMSLabworkStepSpecification[]
}

export interface FMSLabworkStepSpecification {
    id: number,                         // Step specification object id
    display_name: string                // Display name for user
    sheet_name: string                  // Template where this value is used
    column_name: string                 // Column where the value would appear in template
    value: string                       // String value
}

export interface FMSLibrary extends FMSTrackedModel {
    biosample_id: FMSId                 // Biosample ID
    name: string                        // Library sample name
    volume: number                      // Volume in uL
    depleted: boolean                   // Depleted flag
    concentration?: number              // Concentration in ng/uL
    concentration_nm?: number           // Concentration in nanomolar
    quantity_ng?: number                // Quantity in nanograms
    container: FMSId                    // Container ID
    coordinates: string                 // Coords in container
    is_pool: boolean                    // Pool flag (false for plain sample)
    project: FMSId                      // Project ID
    creation_date: string               // Date library was created (YYYY-MM-DD)
    quality_flag?: boolean              // Quality check flag (undefined in no QC has been performed)
    quantity_flag?: boolean             // Quantity check flag (undefined in no QC has been performed)
    library_type: string                // Library type name, eg "PCR-Free"
    platform: string                    // Platform name, eg "ILLUMINA" or "DNBSEQ"
    library_size?: number               // Size in bp
    index: FMSId                        // Index ID
    library_selection?: string          // library selection name
    library_selection_target?: string   // library selection target
}

export interface FMSLibraryType extends FMSTrackedModel {
    name: string                        // Library type name, eg "PCR-Free"
}

export interface FMSPlatform extends FMSTrackedModel {
    name: string                        // Platform name eg "ILLUMINA" or "DNBSEQ"
}

export interface FMSPooledSample extends FMSTrackedModel {
    // Pooled sample is a flattened version of the pooled sample data returned by the endpoint.
    // The id is the ID of the pool's derived sample.
    pooled_sample_id: number,           // The id of the parent sample pool containing this derived sample
    volume_ratio: number,               // Derived sample volume as a ratio of the total pool volume
  
    project_id: FMSId,                  // Project associated with the derived sample
    project_name: string,               // Project associated with the derived sample
  
    // Sample info
    alias: string,                      // The alias (from the biosample)
    collection_site: string,            // Collection site, eg MUHC
    experimental_group?: string[],      // An array of experimental group names
    individual_id?: FMSId,              // The ID of the individual to whom this sample was extracted
    individual_name?: string,           // Individual name
    parent_sample_id: FMSId,            // The id of the sample that was added to this pool
    parent_sample_name: string,         // The name of the sample that was added to this pool
    sample_kind: string,                // Predefined sample kind (eg BLOOD, DNA, SALIVA...)
  
    // Library fields                   // Library fields are only defined if pool contains libraries
    index?: string,                     // Name of index
    index_id?: FMSId,                   // ID of index
    index_set?: string,                 // Name of index set containing library index
    library_size?: number,              // Library size in base pairs (integer)
    library_type?: string,              // Library Type (eg. PCR-free) (pre-defined)
    platform?: string,                  // Platform name (eg. ILLUMINA)
    strandedness?: string,              // "Double stranded" (for DNA) or "Single stranded" (for RNA)
}

/**
 * Freezeman project model
 */
export interface FMSProject extends FMSTrackedModel {
    name: string                        // The name of the project
    principal_investigator: string      // The principal investigator of the project
    requestor_name: string              // Name of requestor
    requestor_email: string             // The email of the requestor of the project
    targeted_end_date?: string          // Targeted date to conclude the project (YYYY-MM-DD)
    status: 'Open' | 'Closed'           // The status of the project (open or closed)
    external_id?: FMSId                 // Identifier to connect to an external system (eg. Hercules)
    external_name?: string              // Original project name used by external client
    comment: string                     // Other relevant information about the project
}


export interface ProtocolPropertyType {             // Subfield of FMSProtocol
    id: FMSId                                       // PropertyType object id
    name: string                                    // Name of property type
    model: 'process' | 'processmeasurement' | null  // Property model type
}

export interface FMSProtocol extends FMSTrackedModel {
    name: string                        // Protocol name
    child_of: FMSId[]                   // Array of parent protocol id's
    property_types: ProtocolPropertyType[]  // Array of definitions for the properties of this protocol
}

export interface FMSReferenceGenome extends FMSTrackedModel {
    assembly_name: string               // Assembly name of the reference genome
    synonym?: string                    // Other name of the reference genome
    genbank_id?: string                 // GenBank accession number of the reference genome
    refseq_id?: string                  // RefSeq identifier of the reference genome
    taxon_id: FMSId                        // Reference genome used to analyze samples in the study
    size: number                        // Number of base pairs of the reference genome
}

export interface FMSSample extends FMSTrackedModel {
    biosample_id : FMSId                // Biosample ID
    name: string                        // Sample name
    alias: string                       // Alternate name
    volume: number                      // Volume in uL
    depleted: boolean                   // Depleted flag
    concentration?: number              // Concentration in ng/uL, if applicable
    child_of?: FMSId[]                  // Sample lineage
    extracted_from?: FMSId              // If extraction, ID of original sample
    individual?: FMSId                  // Individual ID, if any
    container: FMSId                    // Container holding sample
    coordinates: string                 // Coordinates in container, if applicable
    sample_kind: FMSId                  // Sample kind ID
    is_library: boolean                 // Library flag
    is_pool: boolean                    // Pool flag
    project?: FMSId                     // Project ID
    process_measurements: FMSId[]       // ID's of ProcessMeasurement objects
    tissue_source?: FMSId               // ID of tissue source type
    creation_date: string               // Data sample was submitted or created by a process (YYYY-MM-DD)
    collection_site: string             // Name of collection site
    experimental_group: string[]        // Array of experiment group names
    quality_flag?: boolean              // QC quality flag
    quantity_flag?: boolean             // QC quantity flag
    comment: string                     // User comment
}

export interface FMSSampleKind extends FMSTrackedModel {
    name: string                        // Sample kind name
    is_extracted: boolean               // Indicator to identify kinds that were extracted. Sample will have tissue source.
    concentration_required: boolean     // Sample kind requires a concentration value for sample processing
    molecule_ontology_curie?: string    // SO ontology term to describe a molecule, such as ‘SO:0000991’ (‘genomic_DNA’)
}

export interface FMSSampleNextStep extends FMSTrackedModel {
    sample: FMSId,
    study: FMSId,
    step_order_id: FMSId,
    step_order_number: number
    step: NextStep
}

// This step definition is specific to the sample-next-step api.
export interface NextStep {
    id: number                          // Step ID
    name: string                        // Step name
    protocol_id: number                 // Step's protocol id
}

export interface FMSSequence extends FMSTrackedModel {
    value: string
}

export interface FMSStudy extends FMSTrackedModel {
    project_id: FMSId                   // ID of project that owns study
    letter: string                      // Study letter (eg 'A')
    workflow_id: FMSId                  // ID of workflow associated with study
    start: number                       // Number of starting step in workflow (usually 1)
    end: number                         // Number of end step in workflow (usually the number of the last step in the workflow)
}

export interface FMSTaxon extends FMSTrackedModel {
    name: string                        // Taxon scientific name
    ncbi_id: number                     // Numerical identifier used by the NCBI taxonomy catalog
}

export interface FMSUser extends FMSTrackedModel {
    // The user model is defined by Django
    username: string                    // Django user name
    first_name: string                  // First name
    last_name: string                   // Last name
    email: string                       // Email
    groups: number[]                    // ID's of groups the user belongs to
    is_staff: boolean                   // Staff flag
    is_superuser: boolean               // Superuser flag
    is_active: boolean                  // Active flag
    date_joined: string                 // Timestamp user was created
}

export interface FMSWorkflow extends FMSTrackedModel {
    name: string                        // Workflow name
    structure: string                   // Workflow structure name
    steps_order: WorkflowStep[]         // Workflow step order objects
}

export interface WorkflowStep {         // Not a tracked model - just a simple serialized object
    id: FMSId                           // Step Order ID
    order: number                       // Step order value
    step_id : FMSId                     // Step ID
    step_name: string                   // Step name
    protocol_id:    FMSId               // ID of protocol associated with step
}