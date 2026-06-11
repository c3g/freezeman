export type ExternalIDProjectSample = {
	id: number
	external_id: string
	project_id: number
	project_name: string
	name: string
	alias: string[]
	container?: string | null
	individual: string[]
	creation_date?: string | null
	collection_site: string[]
	comment?: string | null
	experimental_group: string[]
	volume?: number | null
	concentration?: number | null
	quality_flag?: boolean | null
	quantity_flag?: boolean | null
	identity_flag?: boolean | null
	number_of_reads: number
	last_process_id?: number | null
	last_process_name?: string | null
	last_process_execution_date?: string | null
}

export type ExternalIDProjectSamplesSummary = {
	total_samples: number

	qc_passed_count: number
	qc_review_count: number
	missing_qc_count: number

	with_process_count: number
	without_process_count: number
	process_coverage_percent: number

	total_quantity: number
	avg_concentration: number | null

	total_reads: number
	avg_reads_per_sample: number
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

	alias: string | null
	cohort: string | null
	library_type: string | null

	barcodes: string[]

	number_of_reads: number | null

	average_quality: string | null
	pf_reads_aligned: string | null
	duplicate_aligned: string | null
}

export interface ProjectOverviewExportButtonData {
	exportType: string
	exportFunction: () => Promise<string>
	filename: string
	itemsCount: number
	disabled: boolean
}
