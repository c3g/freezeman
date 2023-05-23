import { Table, TableColumnProps } from 'antd'
import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { ExternalExperimentRun } from '../../models/frontend_models'
import { selectExternalExperimentRunsState } from '../../selectors'
import { loadExternalExperimentRuns } from '../../modules/experimentRuns/externalExperimentsActions'

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
	const dispatch = useAppDispatch()
	const runsState = useAppSelector(selectExternalExperimentRunsState)

	useEffect(() => {
		dispatch(loadExternalExperimentRuns())
	}, [])

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
			bordered={true}
		></Table>
	)
}

export default ExternalExperimentRunsListContent