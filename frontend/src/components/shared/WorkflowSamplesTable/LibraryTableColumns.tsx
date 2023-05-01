import React from 'react'
import { Link } from 'react-router-dom'
import { FILTER_TYPE } from '../../../constants'
import { Library } from '../../../models/frontend_models'
import { FilterDescription } from '../../../models/paged_items'
import { WithIndexRenderComponent, WithProjectRenderComponent } from '../WithItemRenderComponent'
import { IdentifiedTableColumnType } from './SampleTableColumns'
import { UNDEFINED_FILTER_KEY } from './SampleTableColumns'

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
}

export const LIBRARY_COLUMN_DEFINITIONS: { [key in LibraryColumnID]: LibraryColumn } = {
	[LibraryColumnID.CONCENTRATION_NM]: {
		columnID: LibraryColumnID.CONCENTRATION_NM,
		title: 'Conc. (nM)',
		dataIndex: ['library', 'concentration_nm'],
		align: 'right',
		className: 'table-column-numbers',
		render: (conc) => conc && parseFloat(conc).toFixed(3),
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
		dataIndex: 'platform',
		render: (_, { library }) => {
			return library && library.platform && <span>{library.platform}</span>
		},
	},

	[LibraryColumnID.PROJECT_NAME]: {
		columnID: LibraryColumnID.PROJECT_NAME,
		title: 'Project',
		dataIndex: 'project',
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

	[LibraryColumnID.PLATFORM_NAME]: {
		columnID: LibraryColumnID.PLATFORM_NAME,
		title: 'Platform',
		dataIndex: 'platform',
		render: (_, { library }) => {
			return library && library.platform && <span>{library.platform}</span>
		},
	},

	[LibraryColumnID.SELECTION_TARGET]: {
		columnID: LibraryColumnID.SELECTION_TARGET,
		title: 'Selection Target',
		dataIndex: ['library', 'library_selection_target'],
		render: (_, { library }) => library && library.library_selection_target && <span>{library.library_selection_target}</span>,
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
