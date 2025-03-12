import React from 'react'
import { Link } from "react-router-dom"
import { Dataset } from "../../models/frontend_models"
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns"
import { FilterDescription } from '../../models/paged_items'
import { FILTER_TYPE } from '../../constants'
import { UNDEFINED_FILTER_KEY } from '../pagedItemsTable/PagedItemsFilters'
import { Button } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { ValidationStatus } from '../../models/fms_api_models'
import dayjs from 'dayjs'


export interface ObjectWithDataset {
	dataset: Dataset
}

export enum DatasetColumnID {
	ID  = 'ID',
	RUN = 'RUN',
	PROJECT = 'PROJECT',
	LANE = 'LANE',
	VALIDATION_STATUS = 'VALIDATION_STATUS',
	READSETS_RELEASED = 'READSETS_RELEASED',
	LATEST_RELEASE_UPDATE = 'LATEST_RELEASE_UPDATE',
	LATEST_VALIDATION_UPDATE = 'LATEST_VALIDATION_UPDATE'
}

type DatasetColumn = IdentifiedTableColumnType<ObjectWithDataset>

export const DATASET_COLUMN_DEFINITIONS : {[key in DatasetColumnID] : DatasetColumn} = {
	[DatasetColumnID.ID]: {
		columnID: DatasetColumnID.ID,
		title: 'ID',
		dataIndex: ['dataset', 'id'],
		render: (_, {dataset}) => {
			return <Link to={`/datasets/${dataset.id}`}>
                    <div>{dataset.id}</div>
                </Link>
		},
		width: 90,
		sorter: { multiple: 1 }
	},
	[DatasetColumnID.RUN]: {
		columnID: DatasetColumnID.RUN,
		title: 'Run',
		dataIndex: ['dataset', 'run_name'],
		sorter: { multiple: 1 }
	},
	[DatasetColumnID.PROJECT]: {
		columnID: DatasetColumnID.PROJECT,
		title: 'Project',
		dataIndex: ['dataset', 'project_name'],
		sorter: { multiple: 1 }
	},
	[DatasetColumnID.LANE]: {
		columnID: DatasetColumnID.LANE,
		title: 'Lane',
		dataIndex: ['dataset', 'lane'],
		sorter: { multiple: 1 }
	},
	[DatasetColumnID.VALIDATION_STATUS]: {
		columnID: DatasetColumnID.VALIDATION_STATUS,
		title: 'Validation Status',
		dataIndex: ['dataset', 'validation_status'],
		render: (_, {dataset: { validation_status }}) => {
			return (
				(validation_status === ValidationStatus.PASSED && <Button style={{color: "#a0d911"}}><CheckOutlined/>Passed</Button>)
				||
				(validation_status === ValidationStatus.FAILED && <Button style={{color: "#f5222d"}}><CloseOutlined/>Failed</Button>)
			)
		}
	},
	[DatasetColumnID.READSETS_RELEASED]: {
		columnID: DatasetColumnID.READSETS_RELEASED,
		title: 'Readsets Released',
		dataIndex: ['dataset', 'released_status_count'],
		render: (_, {dataset}) => {
			return `${dataset.released_status_count}/${dataset.readset_count}`	// TODO display the total number of readsets
		}
	},
	[DatasetColumnID.LATEST_RELEASE_UPDATE]: {
		columnID: DatasetColumnID.LATEST_RELEASE_UPDATE,
		title: "Latest Release Status Update",
		dataIndex: ['dataset', 'latest_release_update'],
		render: (_, {dataset}) => {
			return dataset.latest_release_update ? dayjs(dataset.latest_release_update).format("YYYY-MM-DD") : ""
		}
	},
	[DatasetColumnID.LATEST_VALIDATION_UPDATE]: {
		columnID: DatasetColumnID.LATEST_VALIDATION_UPDATE,
		title: "Latest Validation Status Update",
		dataIndex: ['dataset', 'latest_validation_update'],
		render: (_, {dataset}) => {
			return dataset.latest_validation_update ? dayjs(dataset.latest_validation_update).format("YYYY-MM-DD") : ""
		}
	}
}

enum DatasetFilterID {
	ID = DatasetColumnID.ID,
	RUN = DatasetColumnID.RUN,
	PROJECT = DatasetColumnID.PROJECT,
	LANE = DatasetColumnID.LANE,
	LATEST_RELEASE_UPDATE = DatasetColumnID.LATEST_RELEASE_UPDATE,
	LATEST_VALIDATION_UPDATE = DatasetColumnID.LATEST_VALIDATION_UPDATE
}

export const DATASET_FILTER_DEFINITIONS : {[key in DatasetFilterID]: FilterDescription} = {
	[DatasetColumnID.ID]: {
		type: FILTER_TYPE.INPUT_NUMBER,
		key: UNDEFINED_FILTER_KEY,
		label: "Dataset ID",
	},
	[DatasetColumnID.RUN]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Run Name",
	},
	[DatasetColumnID.PROJECT]: {
		type: FILTER_TYPE.INPUT,
		key: UNDEFINED_FILTER_KEY,
		label: "Project Name",
	},
	[DatasetColumnID.LANE]: {
		type: FILTER_TYPE.INPUT_NUMBER,
		key: UNDEFINED_FILTER_KEY,
		label: "Lane",
	},
	[DatasetFilterID.LATEST_RELEASE_UPDATE]: {
		type: FILTER_TYPE.DATE_RANGE,
		key: 'latest_release_update',
		label: 'Latest Release Update'
	},
	[DatasetFilterID.LATEST_VALIDATION_UPDATE]: {
		type: FILTER_TYPE.DATE_RANGE,
		key: 'latest_validation_update',
		label: 'Latest Validation Update'
	}
}

// Special filter for datasets table that is filtered by a particular project.
export const DATASET_EXTERNAL_PROJECT_FILTER : FilterDescription = {
	type: FILTER_TYPE.INPUT,
	key: 'external_project_id',
	label: 'External Project ID'
}

export const DATASET_FILTER_KEYS: {[key in DatasetFilterID]: string} = {
	[DatasetFilterID.ID]: 'id',
	[DatasetFilterID.RUN]: 'run_name',
	[DatasetFilterID.PROJECT]: 'project_name',
	[DatasetFilterID.LANE]: 'lane',
	[DatasetFilterID.LATEST_RELEASE_UPDATE]: 'latest_release_update',
	[DatasetFilterID.LATEST_VALIDATION_UPDATE]: 'latest_validation_update'
}

