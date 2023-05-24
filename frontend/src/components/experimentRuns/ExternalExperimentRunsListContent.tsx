import { Table, TableColumnProps } from 'antd'
import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { ExternalExperimentRun } from '../../models/frontend_models'
import { selectExternalExperimentRuns, selectExternalExperimentRunsState } from '../../selectors'
import { loadExternalExperimentRuns } from '../../modules/experimentRuns/externalExperimentsActions'
import { Link } from 'react-router-dom'

// interface ExternalExperimentRunsListContentProps {

// }

function getTableColumns() : TableColumnProps<ExternalExperimentRun>[] {
	return [
		{
			title: 'Name',
			dataIndex: 'run_name',
			render: (_, experimentRun) => {
				return (
					<Link to={`/experiment-runs/external/${experimentRun.run_name}`}>{experimentRun.run_name}</Link>
				)
			}
		},
		{
			title: 'Latest Submission Date',
			dataIndex: 'latest_submission_timestamp'
		}
	]
}

function ExternalExperimentRunsListContent() {
	const dispatch = useAppDispatch()

	useEffect(() => {
		dispatch(loadExternalExperimentRuns())
	}, [/* Only run fetch once*/])

	return (
		<ExternalExperimentRunsTable/>
	)
}


function ExternalExperimentRunsTable() {

	const runs = useAppSelector(selectExternalExperimentRuns)
	const columns = getTableColumns()

	return (
		<Table
			columns={columns}
			dataSource={runs}
			rowKey={'run_name'}
			bordered={true}
		></Table>
	)
}

export default ExternalExperimentRunsListContent