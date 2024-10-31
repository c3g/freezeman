import React from 'react'
import { Link } from "react-router-dom"
import { FILTER_TYPE, PROJECT_STATUS } from '../../constants'
import { Project } from "../../models/frontend_models"
import { FilterDescription } from '../../models/paged_items'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { UNDEFINED_FILTER_KEY } from '../pagedItemsTable/PagedItemsFilters'

export enum ProjectColumnID {
	ID = 'ID',
	NAME = 'NAME',
    EXTERNAL_ID = 'EXTERNAL_ID',
	PRINCIPAL_INVESTIGATOR = 'PRINCIPAL_INVESTIGATOR',
	REQUESTOR_NAME = 'REQUESTOR_NAME',
	REQUESTOR_EMAIL = 'REQUESTOR_EMAIL',
	TARGETED_END_DATE = 'TARGETED_END_DATE',
	STATUS = 'STATUS',
}


export interface ObjectWithProject {
	project: Project
}

export type ProjectColumn = IdentifiedTableColumnType<ObjectWithProject>

export const PROJECT_COLUMN_DEFINITIONS: { [key in ProjectColumnID]: ProjectColumn } = {
	[ProjectColumnID.ID]: {
		columnID: ProjectColumnID.ID,
		title: 'ID',
		dataIndex: ['project', 'id'],
		sorter: true,
		width: 30,
		render: (id, {project}) => (
			<Link to={`/projects/${project.id}`}>
				<div>{id}</div>
			</Link>
		),
	},
	[ProjectColumnID.NAME]: {
		columnID: ProjectColumnID.NAME,
		title: 'Name',
		dataIndex: ['project', 'name'],
		sorter: true,
		width: 80,
		render: (name, {project}) => (
			<Link to={`/projects/${project.id}`}>
				<div>{name}</div>
			</Link>
		),
	},
    	[ProjectColumnID.EXTERNAL_ID]: {
		columnID: ProjectColumnID.EXTERNAL_ID,
		title: 'External ID',
		dataIndex: ['project', 'external_id'],
		sorter: true,
		width: 70,
	},
	[ProjectColumnID.PRINCIPAL_INVESTIGATOR]: {
		columnID: ProjectColumnID.PRINCIPAL_INVESTIGATOR,
		title: 'Principal Investigator',
		dataIndex: ['project', 'principal_investigator'],
		sorter: true,
		width: 70,
	},
	[ProjectColumnID.REQUESTOR_NAME]: {
		columnID: ProjectColumnID.REQUESTOR_NAME,
		title: 'Requestor Name',
		dataIndex: ['project', 'requestor_name'],
		sorter: true,
		width: 90,
	},
	[ProjectColumnID.REQUESTOR_EMAIL]: {
		columnID: ProjectColumnID.REQUESTOR_EMAIL,
		title: 'Requestor Email',
		dataIndex: ['project', 'requestor_email'],
		width: 115,
	},
	[ProjectColumnID.TARGETED_END_DATE]: {
		columnID: ProjectColumnID.TARGETED_END_DATE,
		title: 'Targeted End Date',
		dataIndex: ['project', 'targeted_end_date'],
		sorter: true,
		width: 50,
	},
	[ProjectColumnID.STATUS]: {
		columnID: ProjectColumnID.STATUS,
		title: 'Status',
		dataIndex: ['project', 'status'],
		sorter: true,
		width: 50,
	},
}

export const PROJECT_FILTERS: { [key in ProjectColumnID]: FilterDescription } = {
	[ProjectColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: 'id',
		label: 'Project ID',
	},
	[ProjectColumnID.NAME]: {
		type: FILTER_TYPE.INPUT,
		key: 'name',
		label: 'Name',
	},
    	[ProjectColumnID.EXTERNAL_ID]: {
		type: FILTER_TYPE.INPUT,
		key: 'external_id',
		label: 'External ID',
	},
	[ProjectColumnID.PRINCIPAL_INVESTIGATOR]: {
		type: FILTER_TYPE.INPUT,
		key: 'principal_investigator',
		label: 'Principal Investigator',
	},
	[ProjectColumnID.STATUS]: {
		type: FILTER_TYPE.SELECT,
		key: 'status',
		label: 'Status',
		mode: 'multiple',
		placeholder: 'All',
		options: PROJECT_STATUS.map((x) => ({ label: x, value: x })),
	},
	[ProjectColumnID.REQUESTOR_NAME]: {
		type: FILTER_TYPE.INPUT,
		key: 'requestor_name',
		label: 'Requestor Name',
	},
	[ProjectColumnID.REQUESTOR_EMAIL]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: 'Requestor Email'
	},
	[ProjectColumnID.TARGETED_END_DATE]: {
		type: FILTER_TYPE.DATE_RANGE,
		key: 'targeted_end_date',
		label: 'Targeted End Date',
	},
}

export const PROJECT_FILTER_KEYS: { [key in ProjectColumnID]: string } = {
	[ProjectColumnID.ID]: 'id',
	[ProjectColumnID.NAME]: 'name',
    [ProjectColumnID.EXTERNAL_ID]: 'external_id',
	[ProjectColumnID.PRINCIPAL_INVESTIGATOR]: 'principal_investigator',
	[ProjectColumnID.REQUESTOR_NAME]: 'requestor_name',
	[ProjectColumnID.REQUESTOR_EMAIL]: 'requestor_email',
	[ProjectColumnID.STATUS]: 'status',
	[ProjectColumnID.TARGETED_END_DATE]: 'targeted_end_date',
}



