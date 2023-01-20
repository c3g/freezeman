import { TableColumnType } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import { Sample } from '../../models/frontend_models'
import { Depletion } from '../Depletion'
import { QCFlag } from '../QCFlag'
import SampleKindTag from '../SampleKindTag'
import { WithContainerRenderComponent, WithIndividualRenderComponent } from '../shared/WithItemRenderComponent'

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

const ID: TableColumnType<ObjectWithSample> = {
	title: 'ID',
	dataIndex: ['sample', 'id'],
	render: (_, { sample }) =>
		sample && (
			<Link to={`/samples/${sample.id}`}>
				<div>{sample.id}</div>
			</Link>
		),
}

const KIND: TableColumnType<ObjectWithSample> = {
	title: 'Kind',
	dataIndex: ['sample', 'sample_kind'],
	render: (_, { sample }) => sample && <SampleKindTag sampleKindID={sample.sample_kind} />,
}

const NAME: TableColumnType<ObjectWithSample> = {
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
}

const INDIVIDUAL: TableColumnType<ObjectWithSample> = {
	title: 'Individual',
	dataIndex: ['sample', 'individual'],
	render: (_, { sample }) => {
		return (
			sample &&
			sample.individual && (
				<Link to={`/individuals/${sample.individual}`}>
					<WithIndividualRenderComponent objectID={sample.individual} render={(individual) => <span>{individual.name}</span>} />
				</Link>
			)
		)
	},
}

const CONTAINER_NAME: TableColumnType<ObjectWithSample> = {
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
}

const CONTAINER_BARCODE: TableColumnType<ObjectWithSample> = {
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
}

const COORDINATES: TableColumnType<ObjectWithSample> = {
	title: 'Coords',
	dataIndex: ['sample', 'coordinates'],
}

const VOLUME: TableColumnType<ObjectWithSample> = {
	title: 'Vol. (µL)',
	dataIndex: ['sample', 'volume'],
	align: 'right',
	className: 'table-column-numbers',
}

const CONCENTRATION: TableColumnType<ObjectWithSample> = {
	title: 'Conc. (ng/µL)',
	dataIndex: ['sample', 'concentration'],
	align: 'right',
	className: 'table-column-numbers',
	render: (conc) => (conc !== null ? parseFloat(conc).toFixed(3) : null),
}

const QC_FLAG: TableColumnType<ObjectWithSample> = {
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
}

const CREATION_DATE: TableColumnType<ObjectWithSample> = {
	title: 'Creation Date',
	dataIndex: ['sample', 'creation_date'],
}

const DEPLETED: TableColumnType<ObjectWithSample> = {
	title: 'Depleted',
	dataIndex: ['sample', 'depleted'],
	render: (depleted) => <Depletion depleted={depleted} />,
}

const SAMPLE_COLUMNS = {
	ID,
	KIND,
	NAME,
	INDIVIDUAL,
	CONTAINER_NAME,
	CONTAINER_BARCODE,
	COORDINATES,
	VOLUME,
	CONCENTRATION,
	QC_FLAG,
	CREATION_DATE,
	DEPLETED,
}

export default SAMPLE_COLUMNS