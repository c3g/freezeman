import React from 'react'
import { Link } from 'react-router-dom'
import { FILTER_TYPE } from '../../constants'
import { Library } from '../../models/frontend_models'
import { FilterDescription } from '../../models/paged_items'
import { WithContainerRenderComponent, WithCoordinateRenderComponent, WithIndexRenderComponent, WithProjectRenderComponent } from '../shared/WithItemRenderComponent'
import { isNullish } from '../../utils/functions'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { UNDEFINED_FILTER_KEY } from '../pagedItemsTable/PagedItemsFilters'
import { QCFlag } from '../QCFlag'
import { Depletion } from '../Depletion'

/*
	Defines a set of Ant Table column descriptors for library fields. Each column
	is defined separately so that components can choose which columns to display
	for a given context.
*/

/* 
	To use these column descriptors, the data objects passed to the Ant table
	must contain a property named 'library' containing a Library object.
*/
export interface ObjectWithLibrary {
	library?: Library
}

export type LibraryColumn = IdentifiedTableColumnType<ObjectWithLibrary>

export enum LibraryColumnID {
	CONCENTRATION_NM = 'CONCENTRATION_NM',
	INDEX_NAME = 'INDEX_NAME',
	LIBRARY_SIZE = 'LIBRARY_SIZE',
	LIBRARY_TYPE = 'LIBRARY_TYPE',
	PLATFORM_NAME = 'PLATFORM_NAME',
	PROJECT_NAME = 'PROJECT_NAME',
	NA_QUANTITY = 'NA_QUANTITY',
	SELECTION_TARGET = 'SELECTION_TARGET',

	// These columns are equivalent to the same columns for Sample,
	// because the Library type duplicates some of the fields from Sample.
	ID = 'ID',
	NAME = 'NAME',
	CONTAINER_BARCODE = 'CONTAINER_BARCODE',
	COORDINATES = 'COORDINATES',
	VOLUME = 'VOLUME',
	CONCENTRATION = 'CONCENTRATION',
	QC_FLAG = 'QC_FLAG',
	CREATION_DATE = 'CREATION_DATE',
	DEPLETED = 'DEPLETED',
}

export const LIBRARY_COLUMN_DEFINITIONS: { [key in LibraryColumnID]: LibraryColumn } = {
	[LibraryColumnID.CONCENTRATION_NM]: {
		columnID: LibraryColumnID.CONCENTRATION_NM,
		title: 'Conc. (nM)',
		dataIndex: ['library', 'concentration_nm'],
		align: 'right',
		className: 'table-column-numbers',
		render: (conc) => isNullish(conc) ? '' : parseFloat(conc).toFixed(3),
	},

	[LibraryColumnID.INDEX_NAME]: {
		columnID: LibraryColumnID.INDEX_NAME,
		title: 'Index',
		dataIndex: ['library', 'index'],
		render: (_, { library }) => {
			return (
				library &&
				library.index && (
					<WithIndexRenderComponent
						objectID={library.index}
						placeholder={<span>loading...</span>}
						render={(index) => <Link to={`/indices/${library.index}`}>{index.name}</Link>}
					/>
				)
			)
		},
	},

	[LibraryColumnID.LIBRARY_SIZE]: {
		columnID: LibraryColumnID.LIBRARY_SIZE,
		title: 'Library Size',
		dataIndex: ['library', 'library_size'],
		align: 'right',
		className: 'table-column-numbers',
		render: (library_size) => library_size && <span>{library_size}</span>,
	},

	[LibraryColumnID.LIBRARY_TYPE]: {
		columnID: LibraryColumnID.LIBRARY_TYPE,
		title: 'Library Type',
		dataIndex: ['library', 'library_type'],
		render: (_, { library }) => library && library.library_type && <span>{library.library_type}</span>,
	},

	[LibraryColumnID.PLATFORM_NAME]: {
		columnID: LibraryColumnID.PLATFORM_NAME,
		title: 'Platform',
		dataIndex: ['library', 'platform'],
		render: (_, { library }) => {
			return library && library.platform && <span>{library.platform}</span>
		},
	},

	[LibraryColumnID.PROJECT_NAME]: {
		columnID: LibraryColumnID.PROJECT_NAME,
		title: 'Project',
		dataIndex: ['library', 'project'],
		render: (_, { library }) => {
			return (
				library &&
				library.project && (
					<WithProjectRenderComponent
						objectID={library.project}
						placeholder={<span>loading...</span>}
						render={(project) => <Link to={`/projects/${library.project}`}>{project.name}</Link>}
					/>
				)
			)
		},
	},

	[LibraryColumnID.NA_QUANTITY]: {
		columnID: LibraryColumnID.NA_QUANTITY,
		title: 'NA Qty (ng)',
		dataIndex: ['library', 'quantity_ng'],
		align: 'right',
		className: 'table-column-numbers',
		render: (qty) => qty && parseFloat(qty).toFixed(3),
	},

	[LibraryColumnID.SELECTION_TARGET]: {
		columnID: LibraryColumnID.SELECTION_TARGET,
		title: 'Selection Target',
		dataIndex: ['library', 'library_selection_target'],
		render: (_, { library }) => library && library.library_selection_target && <span>{library.library_selection_target}</span>,
	},

	[LibraryColumnID.ID]: {
		columnID: LibraryColumnID.ID,
		title: 'ID',
		dataIndex: ['library', 'id'],
		render: (_, { library }) =>
			library && (
				<Link to={`/samples/${library.id}`}>
					<div>{library.id}</div>
				</Link>
			),
	},

	[LibraryColumnID.NAME]: {
		columnID: LibraryColumnID.NAME,
		title: 'Name',
		dataIndex: ['library', 'name'],
		render: (name, { library }) =>
			library && (
				<Link to={`/samples/${library.id}`}>
					{library.name}
				</Link>
			),
	},

	[LibraryColumnID.CONTAINER_BARCODE]: {
		columnID: LibraryColumnID.CONTAINER_BARCODE,
		title: 'Container Barcode',
		dataIndex: ['library', 'container'],
		render: (_, { library }) => {
			return (
				library &&
				library.container && (
					<WithContainerRenderComponent
						objectID={library.container}
						placeholder={<span>loading...</span>}
						render={(container) => <Link to={`/containers/${library.container}`}>{container.barcode}</Link>}
					/>
				)
			)
		},
	},

	[LibraryColumnID.COORDINATES]: {
		columnID: LibraryColumnID.COORDINATES,
		title: 'Coords',
		dataIndex: ['library', 'coordinate'],
		render: (_, { library }) => {
				return (
					library &&
					library.coordinate && (
						<WithCoordinateRenderComponent
							objectID={library.coordinate}
							placeholder={<span>loading...</span>}
							render={(coordinate) => <span>{coordinate.name}</span>}
						/>
					)
				)
			},
	},

	[LibraryColumnID.VOLUME]: {
		columnID: LibraryColumnID.VOLUME,
		title: 'Vol. (µL)',
		dataIndex: ['library', 'volume'],
		align: 'right',
		className: 'table-column-numbers',
	},

	[LibraryColumnID.CONCENTRATION]: {
		columnID: LibraryColumnID.CONCENTRATION,
		title: 'Conc. (ng/µL)',
		dataIndex: ['library', 'concentration'],
		align: 'right',
		className: 'table-column-numbers',
		render: (conc) => (conc !== null ? parseFloat(conc).toFixed(3) : null),
	},

	[LibraryColumnID.QC_FLAG]: {
		columnID: LibraryColumnID.QC_FLAG,
		title: 'QC Flag',
		dataIndex: ['library', 'qc_flag'],
		render: (_, { library }) => {
			if (library) {
				const flags = { quantity: library.quantity_flag, quality: library.quality_flag }
				if (flags.quantity !== null && flags.quality !== null) {
					return <QCFlag flags={flags} />
				}
			}
			return null
		},
	},

	[LibraryColumnID.CREATION_DATE]: {
		columnID: LibraryColumnID.CREATION_DATE,
		title: 'Creation Date',
		dataIndex: ['library', 'creation_date'],
	},

	[LibraryColumnID.DEPLETED]: {
		columnID: LibraryColumnID.DEPLETED,
		title: 'Depleted',
		dataIndex: ['library', 'depleted'],
		render: (depleted) => <Depletion depleted={depleted} />,
	},

}

/**
 *	Filter definitions
 */
export const LIBRARY_COLUMN_FILTERS: { [key: string]: FilterDescription } = {
	[LibraryColumnID.LIBRARY_TYPE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Library Type',
	},
	[LibraryColumnID.SELECTION_TARGET]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Library Selection Target',
	},
	[LibraryColumnID.INDEX_NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Index',
	},
	[LibraryColumnID.PLATFORM_NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Platform',
	},
	[LibraryColumnID.PROJECT_NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Project',
		batch: true,
	},
	[LibraryColumnID.NA_QUANTITY]: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Qty (ng)',
	},
	[LibraryColumnID.LIBRARY_SIZE]: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Library Size',
	},


	[LibraryColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sample ID'
	},
	[LibraryColumnID.NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Name',
		batch: true,
	},
	[LibraryColumnID.CONTAINER_BARCODE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Container Barcode',
		recursive: true,
		batch: true,
	},
	[LibraryColumnID.COORDINATES]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Coordinates',
	},
	[LibraryColumnID.VOLUME]: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Volume',
	},
	[LibraryColumnID.CONCENTRATION]: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Concentration',
	},
	[LibraryColumnID.QC_FLAG]: {
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
	[LibraryColumnID.CREATION_DATE]: {
		type: FILTER_TYPE.DATE_RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Creation Date',
	},
	[LibraryColumnID.DEPLETED]: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Depleted',
		placeholder: 'All',
		options: [
			{ label: 'Yes', value: 'true' },
			{ label: 'No', value: 'false' },
		],
	},
}

export const LIBARY_TABLE_FILTER_KEYS : {[key in LibraryColumnID] : string} = {
	[LibraryColumnID.LIBRARY_TYPE]: 'derived_samples__library__library_type__name',
	[LibraryColumnID.SELECTION_TARGET]: 'derived_samples__library__library_selection__target',
	[LibraryColumnID.INDEX_NAME]: 'derived_samples__library__index__name',
	[LibraryColumnID.PLATFORM_NAME]: 'derived_samples__library__platform__name',
	[LibraryColumnID.PROJECT_NAME]: 'derived_samples__project__name',
	[LibraryColumnID.NA_QUANTITY]: 'quantity_ng',
	[LibraryColumnID.LIBRARY_SIZE]: 'sample__fragment_size',
	[LibraryColumnID.CONCENTRATION_NM]: '', // unused

	[LibraryColumnID.ID]: 'id',
	[LibraryColumnID.NAME]: 'name',
	[LibraryColumnID.CONTAINER_BARCODE]: 'container__barcode',
	[LibraryColumnID.COORDINATES]: 'coordinate__name',
	[LibraryColumnID.VOLUME]: 'volume',
	[LibraryColumnID.CONCENTRATION]: 'concentration',
	[LibraryColumnID.QC_FLAG]: 'qc_flag',
	[LibraryColumnID.CREATION_DATE]: 'creation_date',
	[LibraryColumnID.DEPLETED]: 'depleted',
}

// Filter keys for sample-next-step endpoint
export const SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS = {
	[LibraryColumnID.LIBRARY_TYPE]: 'sample__derived_samples__library__library_type__name',
	[LibraryColumnID.SELECTION_TARGET]: 'sample__derived_samples__library__library_selection__target',
	[LibraryColumnID.INDEX_NAME]: 'sample__derived_samples__library__index__name',
	[LibraryColumnID.PLATFORM_NAME]: 'sample__derived_samples__library__platform__name',
	[LibraryColumnID.PROJECT_NAME]: 'sample__derived_samples__project__name',
	[LibraryColumnID.NA_QUANTITY]: 'quantity_ng',	// annotated property of viewset
	[LibraryColumnID.LIBRARY_SIZE]: 'sample__fragment_size',
}

export const SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS = {
	[LibraryColumnID.LIBRARY_TYPE]: 'sample_next_step__sample__derived_samples__library__library_type__name',
	[LibraryColumnID.SELECTION_TARGET]: 'sample_next_step__sample__derived_samples__library__library_selection__target',
	[LibraryColumnID.INDEX_NAME]: 'sample_next_step__sample__derived_samples__library__index__name',
	[LibraryColumnID.PLATFORM_NAME]: 'sample_next_step__sample__derived_samples__library__platform__name',
	[LibraryColumnID.PROJECT_NAME]: 'sample_next_step__sample__derived_samples__project__name',
	[LibraryColumnID.NA_QUANTITY]: 'quantity_ng',	// TODO annotated property of viewset 
	[LibraryColumnID.LIBRARY_SIZE]: 'sample_next_step__sample__fragment_size',
}
