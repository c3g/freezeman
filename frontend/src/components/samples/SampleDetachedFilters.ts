import { FILTER_TYPE, QPCR_SELECTION_STATUS } from '../../constants'
import { FilterDescription } from '../../models/paged_items'

// Detached filters
export const SAMPLE_PEDIGREE_FILTER: FilterDescription = {
	type: FILTER_TYPE.INPUT,
	key: 'derived_samples__biosample__individual__pedigree',
	label: 'Individual Pedigree',
	width: 250,
}

export const SAMPLE_COHORT_FILTER: FilterDescription = {
	type: FILTER_TYPE.INPUT,
	key: 'derived_samples__biosample__individual__cohort',
	label: 'Individual Cohort',
	width: 250,
}

export const SAMPLE_SEX_FILTER: FilterDescription = {
	type: FILTER_TYPE.SELECT,
	key: 'derived_samples__biosample__individual__sex',
	label: 'Individual Sex',
	mode: 'multiple',
	placeholder: 'All',
	options: [
		{ label: 'Female', value: 'F' },
		{ label: 'Male', value: 'M' },
		{ label: 'Unknown', value: 'Unknown' },
	],
}

export const SAMPLE_COLLECTION_SITE_FILTER: FilterDescription = {
	type: FILTER_TYPE.INPUT,
	key: 'derived_samples__biosample__collection_site',
	label: 'Collection site',
	width: 250,
}

export const SAMPLE_QPCR_STATUS: FilterDescription = {
	type: FILTER_TYPE.SELECT,
	key: 'qPCR_status',
	label: 'qPCR Selection Status',
	placeholder: 'All',
	mode: 'multiple',
	options: QPCR_SELECTION_STATUS.map((x) => ({ label: x, value: x })),
}

export const SAMPLE_METADATA_FILTER: FilterDescription = {
	type: FILTER_TYPE.METADATA,
	key: 'metadata',
	label: 'Metadata',
}

