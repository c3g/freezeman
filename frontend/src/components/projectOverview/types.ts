import { FMSProject } from '../../models/fms_api_models'

export type ExternalIDProjectSample = {
	biosample_id: number
	id: number

	project_ids: number[]
	project_names: string[]

	name: string
	alias: string
	container_barcode: string
	individual: string | null
	creation_date: string
	collection_site: string | null
	comment: string
	experimental_groups: string[]

	volume: string
	concentration: string | null

	quality_flag: boolean | null
	quantity_flag: boolean | null
	identity_flag: boolean | null

	last_process_id: number | null
	last_process_name: string | null
	last_process_execution_date: string | null
}

export type ExternalIDProjectSamplesSummary = {
	total_samples: number

	qc_passed_count: number
	qc_review_count: number
	missing_qc_count: number

	samples_with_assigned_process_count: number
	samples_without_assigned_process_count: number
	samples_assigned_to_a_process_rate: number

	total_quantity: number
	avg_concentration: number | null

	internal_projects_count : number
	experimental_groups_count : number
}

export type ExternalIDProjectSamplesResponse = {
	external_id: string
	count: number
	summary: ExternalIDProjectSamplesSummary
	samples: ExternalIDProjectSample[]
}

export type ProjectOverviewReadset = {
	id: number
	name: string
	readset_sample_name: string
	external_id: string
	run_name: string
	run_start_date: string // YYYY-MM-DD
	validation_status: number | null

	alias: string | null
	cohort: string | null
	library_type: string | null

	barcodes: string[]

	number_of_reads: number | null

	average_quality: string | null
	pf_reads_aligned: string | null
	duplicate_aligned: string | null

	lane: number
	reference_genome_id: number | null
	sequencing_index_name: string | null

	readset_file_paths?: string[]
	readset_file_sizes?: number[]
}

export interface ProjectOverviewExportButtonData {
	exportType: string
	exportFunction: () => Promise<string>
	filename: string
	itemsCount: number
	disabled: boolean
}

export type ProjectsByExternalIDGroup = {
	external_id: string | null
	external_id_number: number | null
	external_project_name: string | null
	project_count: number
	projects: FMSProject[]
}

