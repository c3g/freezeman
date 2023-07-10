import React from 'react'
import { Link } from 'react-router-dom'
import { FILTER_TYPE } from '../../../constants'
import { Sample } from '../../../models/frontend_models'
import { FilterDescription } from '../../../models/paged_items'
import { selectSampleKindsByID } from '../../../selectors'
import store from '../../../store'
import { Depletion } from '../../Depletion'
import { QCFlag } from '../../QCFlag'
import SampleKindTag from '../../SampleKindTag'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { UNDEFINED_FILTER_KEY } from '../../pagedItemsTable/PagedItemsFilters'
import { WithContainerRenderComponent, WithCoordinateRenderComponent, WithIndividualRenderComponent, WithProjectRenderComponent } from '../WithItemRenderComponent'

/*
	Defines a set of Ant Table column descriptors for sample fields. Each column
	is defined separately so that components can choose which columns to display
	for a given context.
*/

/* 
	To use these column descriptors, the data objects passed to the Ant table
	must contain a property named 'sample' containing a Sample object.
*/
export interface ObjectWithSample {
	sample?: Sample
}

export type SampleColumn = IdentifiedTableColumnType<ObjectWithSample>

export enum SampleColumnID {
	ID = 'ID',
	KIND = 'KIND',
	NAME = 'NAME',
	INDIVIDUAL = 'INDIVIDUAL',
	CONTAINER_NAME = 'CONTAINER_NAME',
	CONTAINER_BARCODE = 'CONTAINER_BARCODE',
	COORDINATES = 'COORDINATES',
	VOLUME = 'VOLUME',
	CONCENTRATION = 'CONCENTRATION',
	QC_FLAG = 'QC_FLAG',
	CREATION_DATE = 'CREATION_DATE',
	DEPLETED = 'DEPLETED',
	PROJECT = 'PROJECT',
	COHORT = 'COHORT',
}

export const SAMPLE_COLUMN_DEFINITIONS: { [key in SampleColumnID]: SampleColumn } = {

	[SampleColumnID.ID]: {
		columnID: SampleColumnID.ID,
		title: 'ID',
		dataIndex: ['sample', 'id'],
		render: (_, { sample }) =>
			sample && (
				<Link to={`/samples/${sample.id}`}>
					<div>{sample.id}</div>
				</Link>
			),
	},

	[SampleColumnID.KIND]: {
		columnID: SampleColumnID.KIND,
		title: 'Kind',
		dataIndex: ['sample', 'sample_kind'],
		render: (_, { sample }) => sample && <SampleKindTag sampleKindID={sample.sample_kind} />,
	},

	[SampleColumnID.NAME]: {
		columnID: SampleColumnID.NAME,
		title: 'Name',
		dataIndex: ['sample', 'name'],
		render: (name, { sample }) =>
			sample && (
				<Link to={`/samples/${sample.id}`}>
					<div>{name}</div>
					{sample.alias && (
						<div>
							<small>alias: {sample.alias}</small>
						</div>
					)}
				</Link>
			),
	},

	[SampleColumnID.INDIVIDUAL]: {
		columnID: SampleColumnID.INDIVIDUAL,
		title: 'Individual',
		dataIndex: ['sample', 'individual'],
		render: (_, { sample }) => {
			return (
				sample &&
				sample.individual && (
					<Link to={`/individuals/${sample.individual}`}>
						<WithIndividualRenderComponent
							objectID={sample.individual}
							render={(individual) => <span>{individual.name}</span>}
						/>
					</Link>
				)
			)
		},
	},

	[SampleColumnID.CONTAINER_NAME]: {
		columnID: SampleColumnID.CONTAINER_NAME,
		title: 'Container Name',
		dataIndex: ['sample', 'container'],
		render: (_, { sample }) => {
			return (
				sample &&
				sample.container && (
					<WithContainerRenderComponent
						objectID={sample.container}
						placeholder={<span>loading...</span>}
						render={(container) => <span>{container.name}</span>}
					/>
				)
			)
		},
	},

	[SampleColumnID.CONTAINER_BARCODE]: {
		columnID: SampleColumnID.CONTAINER_BARCODE,
		title: 'Container Barcode',
		dataIndex: ['sample', 'container'],
		render: (_, { sample }) => {
			return (
				sample &&
				sample.container && (
					<WithContainerRenderComponent
						objectID={sample.container}
						placeholder={<span>loading...</span>}
						render={(container) => <Link to={`/containers/${sample.container}`}>{container.barcode}</Link>}
					/>
				)
			)
		},
	},

	[SampleColumnID.COORDINATES]: {
		columnID: SampleColumnID.COORDINATES,
		title: 'Coords',
		dataIndex: ['sample', 'coordinate'],
    render: (_, { sample }) => {
			return (
				sample &&
				sample.coordinate && (
					<WithCoordinateRenderComponent
						objectID={sample.coordinate}
						placeholder={<span>loading...</span>}
						render={(coordinate) => <span>{coordinate.name}</span>}
					/>
				)
			)
		},
	},

	[SampleColumnID.VOLUME]: {
		columnID: SampleColumnID.VOLUME,
		title: 'Vol. (µL)',
		dataIndex: ['sample', 'volume'],
		align: 'right',
		className: 'table-column-numbers',
	},

	[SampleColumnID.CONCENTRATION]: {
		columnID: SampleColumnID.CONCENTRATION,
		title: 'Conc. (ng/µL)',
		dataIndex: ['sample', 'concentration'],
		align: 'right',
		className: 'table-column-numbers',
		render: (conc) => (conc !== null ? parseFloat(conc).toFixed(3) : null),
	},

	[SampleColumnID.QC_FLAG]: {
		columnID: SampleColumnID.QC_FLAG,
		title: 'QC Flag',
		dataIndex: ['sample', 'qc_flag'],
		render: (_, { sample }) => {
			if (sample) {
				const flags = { quantity: sample.quantity_flag, quality: sample.quality_flag }
				if (flags.quantity !== null && flags.quality !== null) {
					return <QCFlag flags={flags} />
				}
			}
			return null
		},
	},

	[SampleColumnID.CREATION_DATE]: {
		columnID: SampleColumnID.CREATION_DATE,
		title: 'Creation Date',
		dataIndex: ['sample', 'creation_date'],
	},

	[SampleColumnID.DEPLETED]: {
		columnID: SampleColumnID.DEPLETED,
		title: 'Depleted',
		dataIndex: ['sample', 'depleted'],
		render: (depleted) => <Depletion depleted={depleted} />,
	},

	[SampleColumnID.PROJECT]: {
		columnID: SampleColumnID.PROJECT,
		title: 'Project',
		dataIndex: ['sample', 'project'],
		sorter: false,	// Disable project sorting, due to pools not being sortable by project
		render: (projectID) => 
			projectID && (
				<WithProjectRenderComponent 
					objectID={projectID}
					render={
						(project) => <Link to={`/projects/${project.id}`}>{project.name}</Link>
					}
				/>
			)
	},
	[SampleColumnID.COHORT]: {
		columnID: SampleColumnID.COHORT,
		title: "Cohort",
		dataIndex: ["derived_samples", "biosample", "individual", "cohort"],
		sorter: true,
		render: (_, { sample }) => {
			const individual = sample?.individual
			return (individual !== undefined &&
			<Link to={`/individuals/${individual}`}>
				<WithIndividualRenderComponent objectID={individual} render={individual => <>{individual.cohort}</>} placeholder={"Loading..."}/>
			</Link>)
		}
	}
}

/**
 * Defines the set of filters that can be applied to sample columns.
 *
 * The object keys in the set map to the 'columnID' property of the column definition.
 *
 * Filter keys are defined separately, as they change depending on which endpoint
 * is being used to retrieve samples.
 */

// Initializes the sample KIND options with the sample kinds in the redux store.
function getSampleKindOptions() {
	const sampleKinds = selectSampleKindsByID(store.getState())
	if (sampleKinds) {
		const options = Object.values(sampleKinds).map((sampleKind) => {
			return {
				label: sampleKind.name,
				value: sampleKind.name
	
			}
		})
		return options
	}return []
}

export const SAMPLE_COLUMN_FILTERS: { [key in SampleColumnID]: FilterDescription } = {
	// Object keys map to column "columnID" properties, to match columns to filters.
	[SampleColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sample ID'
	},
	[SampleColumnID.KIND]: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY, 
		label: 'Type',
		mode: 'multiple',
		placeholder: 'All',
		dynamicOptions: getSampleKindOptions
	},
	[SampleColumnID.NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Name',
		batch: true,
	},
	[SampleColumnID.INDIVIDUAL]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Individual Name',
	},
	[SampleColumnID.CONTAINER_NAME]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Container Name',
		recursive: true,
	},
	[SampleColumnID.CONTAINER_BARCODE]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Container Barcode',
		recursive: true,
		batch: true,
	},
	[SampleColumnID.COORDINATES]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Coordinates',
	},
	[SampleColumnID.VOLUME]: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Volume',
	},
	[SampleColumnID.CONCENTRATION]: {
		type: FILTER_TYPE.RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Concentration',
	},
	[SampleColumnID.CREATION_DATE]: {
		type: FILTER_TYPE.DATE_RANGE,
		key: UNDEFINED_FILTER_KEY,
		label: 'Creation Date',
	},
	[SampleColumnID.DEPLETED]: {
		type: FILTER_TYPE.SELECT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Depleted',
		placeholder: 'All',
		options: [
			{ label: 'Yes', value: 'true' },
			{ label: 'No', value: 'false' },
		],
	},
	[SampleColumnID.QC_FLAG]: {
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
	[SampleColumnID.PROJECT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Project',
	},
	[SampleColumnID.COHORT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Cohort",
	}
}

/**
 * Defines the filter keys used for filtering samples using the sample-next-step endpoint.
 * Filter keys are merged into the filter definition when a table's columns are configured.
 */
export const SAMPLE_NEXT_STEP_FILTER_KEYS: { [key in SampleColumnID]: string } = {
	[SampleColumnID.ID]: 'sample__id',
	[SampleColumnID.KIND]: 'sample__derived_samples__sample_kind__name',
	[SampleColumnID.NAME]: 'sample__name',
	[SampleColumnID.INDIVIDUAL]: 'sample__derived_samples__biosample__individual__name',
	[SampleColumnID.CONTAINER_NAME]: 'sample__container__name',
	[SampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
	[SampleColumnID.COORDINATES]: 'sample__coordinate__name',
	[SampleColumnID.VOLUME]: 'sample__volume',
	[SampleColumnID.CONCENTRATION]: 'sample__concentration',
	[SampleColumnID.CREATION_DATE]: 'sample__creation_date',
	[SampleColumnID.DEPLETED]: 'sample__depleted',
	[SampleColumnID.QC_FLAG]: 'qc_flag',
	[SampleColumnID.PROJECT]: 'sample__derived_samples__project__name',
	[SampleColumnID.COHORT]: 'sample__derived_samples__biosample__individual__cohort'
}

export const SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS: { [key in SampleColumnID]: string } = {
	[SampleColumnID.ID]: 'sample_next_step__sample__id',
	[SampleColumnID.KIND]: 'sample_next_step__sample__derived_samples__sample_kind__name',
	[SampleColumnID.NAME]: 'sample_next_step__sample__name',
	[SampleColumnID.INDIVIDUAL]: 'sample_next_step__sample__derived_samples__biosample__individual__name',
	[SampleColumnID.CONTAINER_NAME]: 'sample_next_step__sample__container__name',
	[SampleColumnID.CONTAINER_BARCODE]: 'sample_next_step__sample__container__barcode',
	[SampleColumnID.COORDINATES]: 'sample_next_step__sample__coordinate__name',
	[SampleColumnID.VOLUME]: 'sample_next_step__sample__volume',
	[SampleColumnID.CONCENTRATION]: 'sample_next_step__sample__concentration',
	[SampleColumnID.CREATION_DATE]: 'sample_next_step__sample__creation_date',
	[SampleColumnID.DEPLETED]: 'sample_next_step__sample__depleted',
	[SampleColumnID.QC_FLAG]: 'sample_next_step__qc_flag',
	[SampleColumnID.PROJECT]: 'sample_next_step__sample__derived_samples__project__name',
	[SampleColumnID.COHORT]: 'sample_next_step__sample__derived_samples__biosample__individual__cohort'
}
