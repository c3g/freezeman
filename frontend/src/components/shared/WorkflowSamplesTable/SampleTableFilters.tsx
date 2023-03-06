import { FILTER_TYPE } from '../../../constants'
import { FilterDescriptionSet } from './getFilterProps'

const UNDEFINED_FILTER_KEY = 'UNDEFINED_FILTER_KEY'

/**
 * Defines the set of filters that can be applied to sample columns.
 * 
 * The object keys in the set map to the 'columnID' property of the column definition.
 * 
 * Filter keys are defined separately, as they change depending on which endpoint
 * is being used to retrieve samples.
 */
const SAMPLE_COLUMN_FILTERS: FilterDescriptionSet = {
	// Object keys map to column "columnID" properties, to match columns to filters.
	ID: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sample ID',
	},
	KIND: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Type',
		mode: 'multiple',
		placeholder: 'All',
	},
	NAME: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Name',
		batch: true,
	},
	INDIVIDUAL: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Individual Name',
	},
	CONTAINER_NAME: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Container Name',
		recursive: true,
	},
	CONTAINER_BARCODE: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Container Barcode',
		recursive: true,
		batch: true,
	},
	COORDINATES: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Coordinates',
	},
	VOLUME: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Volume',
	},
	CONCENTRATION: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Concentration',
	},
	CREATION_DATE: {
		type: FILTER_TYPE.DATE_RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Creation Date',
	},
	DEPLETED: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Depleted',
		placeholder: 'All',
		options: [
			{ label: 'Yes', value: 'true' },
			{ label: 'No', value: 'false' },
		],
	},
	QC_FLAG: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'QC Flag',
		placeholder: 'All',
		mode: 'multiple',
		options: [
			{ label: 'None', value: 'None' },
			{ label: 'Passed', value: 'true' },
			{ label: 'Failed', value: 'false' },
		],
	},
}

/**
 * Defines the filter keys used for filtering samples using the sample-next-step endpoint.
 */
export const SAMPLE_NEXT_STEP_FILTER_KEYS : FilterKeySet = {
	ID: 'sample__id',
	KIND: 'sample__derived_samples__sample_kind__name',
	NAME: 'sample__name',
	INDIVIDUAL: 'sample__derived_samples__biosample__individual__name',
	CONTAINER_NAME: 'sample__container__name',
	CONTAINER_BARCODE: 'sample__container__barcode',
	COORDINATES: 'sample__coordinates',
	VOLUME: 'sample__volume',
	CONCENTRATION: 'sample__concentration',
	CREATION_DATE: 'sample__creation_date',
	DEPLETED: 'sample__depleted',
	QC_FLAG: 'qc_flag',
}

// An object that maps filter key values to filter descriptions.
export interface FilterKeySet {
	[key: string] : string
}

export default SAMPLE_COLUMN_FILTERS
