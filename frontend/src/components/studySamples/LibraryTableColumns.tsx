import { TableColumnType } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import { Library } from '../../models/frontend_models'
import { Depletion } from '../Depletion'
import { QCFlag } from '../QCFlag'
import { WithContainerRenderComponent, WithIndexRenderComponent, WithProjectRenderComponent } from '../shared/WithItemRenderComponent'

export interface ObjectWithLibrary {
	library?: Library
}

const CONCENTRATION_NM: TableColumnType<ObjectWithLibrary> = {
	title: 'Conc. (nM)',
	dataIndex: ['library', 'concentration_nm'],
	align: 'right',
	className: 'table-column-numbers',
	render: (conc) => conc && parseFloat(conc).toFixed(3),
}

const CONCENTRATION: TableColumnType<ObjectWithLibrary> = {
	title: 'Conc. (ng/µL)',
	dataIndex: ['library', 'concentration'],
	align: 'right',
	className: 'table-column-numbers',
	render: (conc) => conc && parseFloat(conc).toFixed(3),
}

const CONTAINER_BARCODE: TableColumnType<ObjectWithLibrary> = {
	title: 'Container Barcode',
	dataIndex: 'container',
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
}

const CONTAINER_NAME: TableColumnType<ObjectWithLibrary> = {
	title: 'Container Name',
	dataIndex: 'container',
	render: (_, { library }) => {
		return (
			library &&
			library.container && (
				<WithContainerRenderComponent
					objectID={library.container}
					placeholder={<span>loading...</span>}
					render={(container) => <span>{container.name}</span>}
				/>
			)
		)
	},
}

const COORDINATES: TableColumnType<ObjectWithLibrary> = {
	title: 'Coords',
	dataIndex: ['library', 'coordinates'],
}

const CREATION_DATE: TableColumnType<ObjectWithLibrary> = {
	title: 'Creation Date',
	dataIndex: ['library', 'creation_date'],
}

const DEPLETED: TableColumnType<ObjectWithLibrary> = {
	title: 'Depleted',
	dataIndex: ['library', 'depleted'],
	render: (depleted) => depleted !== null && <Depletion depleted={depleted} />,
}

const ID: TableColumnType<ObjectWithLibrary> = {
	title: 'ID',
	dataIndex: 'id',
	render: (_, { library }) =>
		library && (
			<Link to={`/samples/${library.id}`}>
				<div>{library.id}</div>
			</Link>
		),
}

const INDEX: TableColumnType<ObjectWithLibrary> = {
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
}

const LIBRARY_SIZE: TableColumnType<ObjectWithLibrary> = {
	title: 'Library Size',
	dataIndex: ['library', 'library_size'],
	align: 'right',
	className: 'table-column-numbers',
	render: (_, { library }) => library && library.library_size && <span>{library.library_size}</span>,
}

const LIBRARY_TYPE: TableColumnType<ObjectWithLibrary> = {
	title: 'Library Type',
	dataIndex: ['library', 'library_type'],
	render: (_, { library }) => library && library.library_type && <span>{library.library_type}</span>,
}

const NA_QUANTITY: TableColumnType<ObjectWithLibrary> = {
	title: 'NA Qty (ng)',
	dataIndex: ['library', 'quantity_ng'],
	align: 'right',
	className: 'table-column-numbers',
	render: (qty) => qty && parseFloat(qty).toFixed(3),
}

const NAME: TableColumnType<ObjectWithLibrary> = {
	title: 'Name',
	dataIndex: 'name',
	render: (_, { library }) =>
		library && (
			<Link to={`/samples/${library.id}`}>
				<div>{library.name}</div>
			</Link>
		),
}

const PLATFORM: TableColumnType<ObjectWithLibrary> = {
	title: 'Platform',
	dataIndex: 'platform',
	render: (_, { library }) => {
		return library && library.platform && <span>{library.platform}</span>
	},
}

const PROJECT: TableColumnType<ObjectWithLibrary> = {
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
}

const QC_FLAG: TableColumnType<ObjectWithLibrary> = {
	title: 'QC Flag',
	dataIndex: 'qc_flag',
	render: (_, { library }) => {
		if (library) {
			const flags = { quantity: library.quantity_flag, quality: library.quality_flag }
			if (flags.quantity !== null && flags.quality !== null) return <QCFlag flags={flags} />
		}
		return null
	},
}

const SELECTION_TARGET: TableColumnType<ObjectWithLibrary> = {
	title: 'Selection Target',
	dataIndex: ['library', 'library_selection_target'],
	render: (_, { library }) => library && library.library_selection_target && <span>{library.library_selection_target}</span>,
}

const VOLUME: TableColumnType<ObjectWithLibrary> = {
	title: 'Vol. (µL)',
	dataIndex: ['library', 'volume'],
	align: 'right',
	className: 'table-column-numbers',
}

const LIBRARY_COLUMNS = {
	CONCENTRATION_NM,
	CONCENTRATION,
	CONTAINER_BARCODE,
	CONTAINER_NAME,
	COORDINATES,
	CREATION_DATE,
	DEPLETED,
	ID,
	INDEX,
	LIBRARY_SIZE,
	LIBRARY_TYPE,
	NA_QUANTITY,
	NAME,
	PLATFORM,
	PROJECT,
	QC_FLAG,
	SELECTION_TARGET,
	VOLUME,
}

export default LIBRARY_COLUMNS
