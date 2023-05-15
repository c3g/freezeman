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

export interface FMSPagedResultsReponse<T> {
    count: number   // The number of objects returned
    next?: string   // A url that will fetch the next page of results, or null if there are no more results.
    prev?: string   // A url that will fetch the previous page of results, or null if there are no more results.
    results: T[]    // An array of objects that were requested
}

export interface FMSTrackedModel {
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
    coordinate: FMSId                   // ID of the coordinates of this container in it's parent container (eg "A01")
    comment: string                     // User comment
    update_comment: string              // User update comment
    location?: FMSId                    // ID of parent container (if any)
    children: FMSId[]                   // ID's of child containers, contained by this container
    samples: FMSId[]                    // ID's of samples contained in the container
    experiment_run?: FMSId              // Experiment run associate with the container (if any)
}

export interface FMSCoordinate extends FMSTrackedModel {
  name: string                       // Coordinates
  column: number                     // Column ordinal starting at 0
  row: number                        // Row ordinal starting at 0
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
    steps: FMSLabworkStep[]             // The steps based on the protocol which have at least one sample waiting
}

export interface FMSLabworkStep {
    id: FMSId                           // Step ID
    name: string                        // Step name
    count: number                       // Number of samples queued at step
    step_specifications: FMSStepSpecification[]  // Step specifications
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
    coordinate: FMSId                   // Coords ID of position in container
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
    library_type?: string,              // Library Type (eg. PCR-free) (pre-defined)
    platform?: string,                  // Platform name (eg. ILLUMINA)
    strandedness?: string,              // "Double stranded" (for DNA) or "Single stranded" (for RNA)
}

export interface FMSProcess extends FMSTrackedModel {
    children_properties: FMSId[]        // ID's of child property values of the process
    children_processes: FMSId[]         // ID's of child processes
    parent_process?: FMSId              // Parent process ID, if any
    protocol: FMSId                     // ID of protocol for process
    imported_template?: FMSId           // Imported template ID, if any
}

export interface FMSProcessMeasurement extends FMSTrackedModel {
    source_sample: FMSId                // Sample that was processed
    child_sample?: FMSId                // Sample created by process (if any)

    protocol: FMSId                     // Protocol ID
    process: FMSId                      // Parent process ID
    properties: FMSId[]                 // ID's of any property values recorded for the sample
    
    volume_used?: number                // Volume of sample consumed by process
    execution_date: string              // Date that sample was processed
    comment?: string                    // User comment
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

/**
 * PropertyValue
 * 
 * Both Processes and ProcessMeasurements can have properties, and the same model
 * is shared for both cases.
 */
export interface FMSPropertyValue extends FMSTrackedModel {
    content_type: FMSId                 // An ID to indicate if this is property of a process or of a process measurement
    object_id: FMSId                    // Either a process ID or a process measurement ID
    property_name: string               // The name of the property
    property_type: FMSId                // The property type ID
    value: any                          // The property value - stored as JSON, so it can be anything
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
    fragment_size?: number              // average size in bp of the sample dna fragment, if applicable
    child_of?: FMSId[]                  // Sample lineage
    extracted_from?: FMSId              // If extraction, ID of original sample
    individual?: FMSId                  // Individual ID, if any
    container: FMSId                    // Container holding sample
    coordinate: FMSId                   // Coordinate ID of position in container, if applicable
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

export interface FMSSampleNextStepByStudy extends FMSTrackedModel {
    sample: FMSId,
    study: FMSId,
    step_order: FMSId
}

// Data type returned by summary_by_study for samples and step histories.
// api/sample-next-step-by-study/summary_by_study/?study__id__in
// api/step-histories/summary_by_study/?study__id__in
export interface FMSStudySamplesCounts {
    study_id: FMSId
    steps: [{
        step_order_id: FMSId
        order: number
        step_name: string
        count: number
    }]
}

export interface FMSSampleNextStep extends FMSTrackedModel {
  sample: FMSId,
  studies: FMSId[],
  step: FMSStep
}

export interface FMSStep extends FMSTrackedModel {
    name: string
    protocol_id: FMSId
    step_specifications: FMSStepSpecification[]
}

export type WorkflowActionType = 'NEXT_STEP' | 'DEQUEUE_SAMPLE' | 'IGNORE_WORKFLOW'

export interface FMSStepHistory extends FMSTrackedModel {
    study: FMSId
    step_order: number
    process_measurement: FMSId
    sample: FMSId
    workflow_action: WorkflowActionType
}

export interface FMSStepSpecification extends FMSTrackedModel {
    display_name: string
    sheet_name: string
    column_name: string
    value: string
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

// Template action description
export interface FMSTemplateAction {
	id: number                          // Action ID (not an FMSId, just a number)
	name: string                        // Action name
	description: string                 // Action description
	template: {                         // List of templates
		description: string             // Template description
		file: string                    // Template file path
		protocol?: string               // Protocol associated with template (if any)
	}[]
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
    steps_order: WorkflowStepOrder[]    // Workflow step order objects
}

export interface WorkflowStepOrder {    // Not a tracked model - just a simple serialized object
    id: FMSId                           // Step Order ID
    order: number                       // Step order value
    step_id: FMSId                      // Step ID
    step_name: string                   // Step name
    protocol_id:    FMSId               // ID of protocol associated with step
}
