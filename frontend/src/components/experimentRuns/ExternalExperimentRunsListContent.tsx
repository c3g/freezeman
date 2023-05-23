import { Table, TableColumnProps } from 'antd'
import React from 'react'
import { ExternalExperimentRun } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { useAppSelector } from '../../hooks'
import { selectExternalExperimentRunsState } from '../../selectors'

// interface ExternalExperimentRunsListContentProps {

// }

function getTableColumns() : TableColumnProps<ExternalExperimentRun>[] {
	return [
		{
			title: 'Name',
			dataIndex: 'run_name',
			// TODO link to open external experiment run details
		},
		{
			title: 'Latest Submission Date',
			dataIndex: 'latest_submission_timestamp'
		}
	]
}

function ExternalExperimentRunsListContent() {

	return (
		<ExternalExperimentRunsTable/>
	)
}


function ExternalExperimentRunsTable() {

	const runsState = useAppSelector(selectExternalExperimentRunsState)
	const columns = getTableColumns()

	return (
		<Table
			columns={columns}
			dataSource={runsState.runs}
			rowKey={'run_name'}
		></Table>
	)
}

export default ExternalExperimentRunsListContent