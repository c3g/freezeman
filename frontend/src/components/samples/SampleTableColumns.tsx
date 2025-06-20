import React from 'react'
import { Link } from 'react-router-dom'
import { Typography } from 'antd'
import { FILTER_TYPE } from '../../constants'
import { Sample } from '../../models/frontend_models'
import { FilterDescription } from '../../models/paged_items'
import { selectSampleKindsByID } from '../../selectors'
import store from '../../store'
import { Depletion } from '../Depletion'
import { QCFlag } from '../QCFlag'
import { isNullish } from '../../utils/functions'
import SampleKindTag from '../SampleKindTag'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { UNDEFINED_FILTER_KEY } from '../pagedItemsTable/PagedItemsFilters'
import { WithContainerRenderComponent, WithCoordinateRenderComponent, WithIndividualRenderComponent, WithProjectRenderComponent } from '../shared/WithItemRenderComponent'

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
	PARENT_CONTAINER = 'PARENT_CONTAINER',
	PARENT_COORDINATES = 'PARENT_COORDINATES',
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
	SAMPLE_COUNT = 'SAMPLE_COUNT',
	QUEUED_STEPS = 'QUEUED_STEPS',
}

const SMALL_COLUMN_WIDTH = 110
const MEDIUM_COLUMN_WIDTH = 170
const LARGE_COLUMN_WIDTH = 270

export const SAMPLE_COLUMN_DEFINITIONS: { [key in SampleColumnID]: SampleColumn } = {

	[SampleColumnID.ID]: {
		columnID: SampleColumnID.ID,
		title: 'ID',
		dataIndex: ['sample', 'id'],
		width: (SMALL_COLUMN_WIDTH + MEDIUM_COLUMN_WIDTH)/2,
		render: (_, { sample }) =>
			sample && (
				<Link to={`/samples/${sample.id}`}>
					<div>{sample.id}</div>
				</Link>
			),
		sorter: { multiple: 1 },
	},

	[SampleColumnID.KIND]: {
		columnID: SampleColumnID.KIND,
		title: 'Kind',
		dataIndex: ['sample', 'sample_kind'],
    	width: SMALL_COLUMN_WIDTH,
		render: (_, { sample }) => sample && <SampleKindTag sampleKindID={sample.sample_kind} />,
		sorter: { multiple: 1 },
	},

	[SampleColumnID.NAME]: {
		columnID: SampleColumnID.NAME,
		title: 'Name',
		dataIndex: ['sample', 'name'],
		width: LARGE_COLUMN_WIDTH,
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
		sorter: { multiple: 1 },
	},

	[SampleColumnID.INDIVIDUAL]: {
		columnID: SampleColumnID.INDIVIDUAL,
		title: 'Individual',
		dataIndex: ['sample', 'individual'],
		width: LARGE_COLUMN_WIDTH,
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
		sorter: { multiple: 1 },
	},

	[SampleColumnID.PARENT_CONTAINER]:  {
		columnID: SampleColumnID.PARENT_CONTAINER,
		title: 'Parent Container Barcode',
		dataIndex: ['sample', 'container'],
		width: LARGE_COLUMN_WIDTH,
		render: (_, { sample }) => {
			return (
				sample &&
				sample.container && (
					<WithContainerRenderComponent
						objectID={sample.container}
						placeholder={<span>loading...</span>}
						render={(container) =>
							container.location ?
								<WithContainerRenderComponent
									objectID={container.location}
									placeholder={<span>loading...</span>}
									render={(container) => <Link to={`/containers/${container.id}`}>{container.barcode}</Link>}
								/>
								: <></>}
					/>
				)
			)
		},
		sorter: { multiple: 1 },
	},

	[SampleColumnID.PARENT_COORDINATES]: {
		columnID: SampleColumnID.PARENT_COORDINATES,
		title: 'Parent Coords',
		dataIndex: ['sample', 'coordinate'],
		width: MEDIUM_COLUMN_WIDTH,
		render: (_, { sample }) => {
			return (
				sample &&
				sample.container && (
					<WithContainerRenderComponent
						objectID={sample.container}
						placeholder={<span>loading...</span>}
						render={(container) =>
							container.coordinate ?
								<WithCoordinateRenderComponent
									objectID={container.coordinate}
									placeholder={<span>loading...</span>}
									render={(coordinate) => <span>{coordinate.name}</span>}
								/>
								:
								<></>
						}
					/>
				)
			)
		},
		sorter: { multiple: 1 },
	},

	[SampleColumnID.CONTAINER_NAME]: {
		columnID: SampleColumnID.CONTAINER_NAME,
		title: 'Container Name',
		dataIndex: ['sample', 'container'],
		width: LARGE_COLUMN_WIDTH,
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
		sorter: { multiple: 1 },
	},

	[SampleColumnID.CONTAINER_BARCODE]: {
		columnID: SampleColumnID.CONTAINER_BARCODE,
		title: 'Container Barcode',
		dataIndex: ['sample', 'container'],
		width: LARGE_COLUMN_WIDTH,
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
		sorter: { multiple: 1 },
	},

	[SampleColumnID.COORDINATES]: {
		columnID: SampleColumnID.COORDINATES,
		title: 'Coords',
		dataIndex: ['sample', 'coordinate'],
		width: SMALL_COLUMN_WIDTH,
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
		sorter: { multiple: 1 },
	},

	[SampleColumnID.VOLUME]: {
		columnID: SampleColumnID.VOLUME,
		title: 'Vol. (µL)',
		dataIndex: ['sample', 'volume'],
    render: (_, { sample }) => sample && !isNullish(sample.volume) && <Typography className='table-column-numbers' style={{float: 'right'}}>{sample.volume}</Typography>,
		width: MEDIUM_COLUMN_WIDTH,
		sorter: { multiple: 1 },
	},

	[SampleColumnID.CONCENTRATION]: {
		columnID: SampleColumnID.CONCENTRATION,
		title: 'Conc. (ng/µL)',
		dataIndex: ['sample', 'concentration'],
		render: (conc) => (conc !== null ? <Typography className='table-column-numbers' style={{float: 'right'}}>{parseFloat(conc).toFixed(3)}</Typography> : null),
		width: MEDIUM_COLUMN_WIDTH,
		sorter: { multiple: 1 },
	},

	[SampleColumnID.QC_FLAG]: {
		columnID: SampleColumnID.QC_FLAG,
		title: 'QC Flag',
		dataIndex: ['sample', 'qc_flag'],
		render: (_, { sample }) => {
			if (sample) {
				const flags = { quantity: sample.quantity_flag, quality: sample.quality_flag }
				if (!isNullish(flags.quantity) || !isNullish(flags.quality)) {
					return <QCFlag flags={flags} />
				}
			}
			return null
		},
		width: MEDIUM_COLUMN_WIDTH,
		sorter: { multiple: 1 },
	},

	[SampleColumnID.CREATION_DATE]: {
		columnID: SampleColumnID.CREATION_DATE,
		title: 'Creation Date',
		dataIndex: ['sample', 'creation_date'],
		width: MEDIUM_COLUMN_WIDTH,
		sorter: { multiple: 1 },
	},

	[SampleColumnID.DEPLETED]: {
		columnID: SampleColumnID.DEPLETED,
		title: 'Depleted',
		dataIndex: ['sample', 'depleted'],
		render: (depleted) => <Depletion depleted={depleted} />,
		width: MEDIUM_COLUMN_WIDTH,
		sorter: { multiple: 1 }
	},

	[SampleColumnID.PROJECT]: {
		columnID: SampleColumnID.PROJECT,
		title: 'Project',
		dataIndex: ['sample', 'project'],
		sorter: false,	// Disable project sorting, due to pools not being sortable by project
		width: LARGE_COLUMN_WIDTH,
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
		width: MEDIUM_COLUMN_WIDTH,
		render: (_, { sample }) => {
			const individual = sample?.individual
			return (individual !== undefined &&
				<Link to={`/individuals/${individual}`}>
					<WithIndividualRenderComponent objectID={individual} render={individual => <>{individual.cohort}</>} placeholder={""} />
				</Link>)
		},
		sorter: { multiple: 1 },
	},
	[SampleColumnID.SAMPLE_COUNT]: {
		columnID: SampleColumnID.SAMPLE_COUNT,
		title: 'Samples in pool',
		dataIndex: ['sample', 'id'],
		width: MEDIUM_COLUMN_WIDTH,
		render: (_, { sample }) => {
			return (
				sample && sample.is_pool
					? sample.derived_samples_count
					: ''
			)
		},
	},
	[SampleColumnID.QUEUED_STEPS]: {
		columnID: SampleColumnID.QUEUED_STEPS,
		// purposefully left empty
		// see WorkflowAssigment.tsx for implementation
	}
}
for (const columnID in SAMPLE_COLUMN_DEFINITIONS) {
	SAMPLE_COLUMN_DEFINITIONS[columnID as keyof typeof SAMPLE_COLUMN_DEFINITIONS].showSorterTooltip = false
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
	} return []
}

export const SAMPLE_COLUMN_FILTERS: { [key in SampleColumnID]: FilterDescription } = {
	// Object keys map to column "columnID" properties, to match columns to filters.
	[SampleColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: UNDEFINED_FILTER_KEY,
		label: 'Sample ID',
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
		width: 'max-content'
	},
	[SampleColumnID.INDIVIDUAL]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Individual Name',
	},
	[SampleColumnID.PARENT_CONTAINER]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Parent Container Barcode',
		recursive: true,
		batch: true,
	},
	[SampleColumnID.PARENT_COORDINATES]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Parent Coords',
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
		width: 'max-content'
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
		batch: true,
	},
	[SampleColumnID.COHORT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Cohort",
	},
	[SampleColumnID.SAMPLE_COUNT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Samples in pool",
	},
	[SampleColumnID.QUEUED_STEPS]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Queued Steps',
	}
}

/**
 * Defines the filter keys used for filtering samples using the sample-next-step endpoint.
 * Filter keys are merged into the filter definition when a table's columns are configured.
 */
export const SAMPLE_FILTER_KEYS: { [key in SampleColumnID]: string } = {
	[SampleColumnID.ID]: 'id',
	[SampleColumnID.KIND]: 'derived_samples__sample_kind__name',
	[SampleColumnID.NAME]: 'name',
	[SampleColumnID.INDIVIDUAL]: 'derived_samples__biosample__individual__name',
	[SampleColumnID.PARENT_CONTAINER]: 'container__location__barcode',
	[SampleColumnID.PARENT_COORDINATES]: 'container__coordinate__name',
	[SampleColumnID.CONTAINER_NAME]: 'container__name',
	[SampleColumnID.CONTAINER_BARCODE]: 'container__barcode',
	[SampleColumnID.COORDINATES]: 'coordinate__name',
	[SampleColumnID.VOLUME]: 'volume',
	[SampleColumnID.CONCENTRATION]: 'concentration',
	[SampleColumnID.CREATION_DATE]: 'creation_date',
	[SampleColumnID.DEPLETED]: 'depleted',
	[SampleColumnID.QC_FLAG]: 'qc_flag',
	[SampleColumnID.PROJECT]: 'derived_by_samples__project__name',
	[SampleColumnID.COHORT]: 'derived_samples__biosample__individual__cohort',
	[SampleColumnID.QUEUED_STEPS]: 'sample_next_steps__step__name',
	[SampleColumnID.SAMPLE_COUNT]: '',
}

export const SAMPLE_NEXT_STEP_FILTER_KEYS: { [key in SampleColumnID]: string } = {
	[SampleColumnID.ID]: 'sample__id',
	[SampleColumnID.KIND]: 'sample__derived_samples__sample_kind__name',
	[SampleColumnID.NAME]: 'sample__name',
	[SampleColumnID.INDIVIDUAL]: 'sample__derived_samples__biosample__individual__name',
	[SampleColumnID.PARENT_CONTAINER]: 'sample__container__location__barcode',
	[SampleColumnID.PARENT_COORDINATES]: 'sample__container__coordinate__name',
	[SampleColumnID.CONTAINER_NAME]: 'sample__container__name',
	[SampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
	[SampleColumnID.COORDINATES]: 'sample__coordinate__name',
	[SampleColumnID.VOLUME]: 'sample__volume',
	[SampleColumnID.CONCENTRATION]: 'sample__concentration',
	[SampleColumnID.CREATION_DATE]: 'sample__creation_date',
	[SampleColumnID.DEPLETED]: 'sample__depleted',
	[SampleColumnID.QC_FLAG]: 'qc_flag',
	[SampleColumnID.PROJECT]: 'project_name',
	[SampleColumnID.COHORT]: 'sample__derived_samples__biosample__individual__cohort',
	[SampleColumnID.QUEUED_STEPS]: 'step__name',
	[SampleColumnID.SAMPLE_COUNT]: '',
}

export const SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS: { [key in SampleColumnID]: string } = {
	[SampleColumnID.ID]: 'sample_next_step__sample__id',
	[SampleColumnID.KIND]: 'sample_next_step__sample__derived_samples__sample_kind__name',
	[SampleColumnID.NAME]: 'sample_next_step__sample__name',
	[SampleColumnID.INDIVIDUAL]: 'sample_next_step__sample__derived_samples__biosample__individual__name',
	[SampleColumnID.PARENT_CONTAINER]: 'sample_next_step__sample__container__location__barcode',
	[SampleColumnID.PARENT_COORDINATES]: 'sample_next_step__sample__container__coordinate__name',
	[SampleColumnID.CONTAINER_NAME]: 'sample_next_step__sample__container__name',
	[SampleColumnID.CONTAINER_BARCODE]: 'sample_next_step__sample__container__barcode',
	[SampleColumnID.COORDINATES]: 'sample_next_step__sample__coordinate__name',
	[SampleColumnID.VOLUME]: 'sample_next_step__sample__volume',
	[SampleColumnID.CONCENTRATION]: 'sample_next_step__sample__concentration',
	[SampleColumnID.CREATION_DATE]: 'sample_next_step__sample__creation_date',
	[SampleColumnID.DEPLETED]: 'sample_next_step__sample__depleted',
	[SampleColumnID.QC_FLAG]: 'qc_flag',
	[SampleColumnID.PROJECT]: 'sample_next_step__sample__derived_by_samples__project__name',
	[SampleColumnID.COHORT]: 'sample_next_step__sample__derived_samples__biosample__individual__cohort',
	[SampleColumnID.QUEUED_STEPS]: 'sample_next_step__step__name',
	[SampleColumnID.SAMPLE_COUNT]: '',
}


