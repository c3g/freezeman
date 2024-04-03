import { Pagination, Table, TableColumnType } from 'antd'
import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CompletedSamplesTableState, CompletedStudySample, StudySampleStep, StudyUXStepSettings } from "../../modules/studySamples/models"
import { WithSampleRenderComponent } from '../shared/WithItemRenderComponent'
import { FMSId, WorkflowActionType } from '../../models/fms_api_models'
import { setStudyStepPageNumber, setStudyStepPageSize } from '../../modules/studySamples/actions'
import { useAppDispatch } from '../../hooks'
import { DEFAULT_SMALL_PAGINATION_LIMIT } from '../../config'

type CompletedSampleColumn = TableColumnType<CompletedStudySample>

const SOURCE_SAMPLE : CompletedSampleColumn = {
	title: 'Source Sample',
	dataIndex: 'sampleID',
	render: (sampleID) => {
		return (
			<WithSampleRenderComponent objectID={sampleID} render={
				sample => 
					<Link to={`/samples/${sample.id}`}>{sample.name}</Link>
			}/>
		)
	}
}

const GENERATED_SAMPLE : CompletedSampleColumn = {
	title: 'Generated Sample',
	dataIndex: 'generatedSampleID',
	render: (sampleID) => {
		if (sampleID) {
			return (
				<WithSampleRenderComponent objectID={sampleID} render={
					sample => <Link to={`/samples/${sample.id}`}>{sample.name}</Link> 
				}/>
			)
		}	
	}
}

const PROCESS_ID : CompletedSampleColumn = {
	title : 'Process ID',
	dataIndex: 'processID',
	render: (processID) => <Link to={`/processes/${processID}`}>{processID}</Link>
}

const PROCESS_MEASUREMENT_ID : CompletedSampleColumn = {
	title: 'Sample Process ID',
	dataIndex: 'processMeasurementID',
	render: (measurementID) => <Link to={`/process-measurements/${measurementID}`}>{measurementID}</Link>
}

const EXECUTION_DATE: CompletedSampleColumn = {
	title: 'Completion Date',
	dataIndex: 'executionDate',
}

const USER: CompletedSampleColumn = {
	title: 'Submitted By',
	dataIndex: 'executedBy',
}

const COMMENT: CompletedSampleColumn = {
	title: 'Comment',
	dataIndex: 'comment',
	render: (comment) => {
		if (comment && (comment as string).startsWith('Automatically generated on')) {
			return null
		}
		return comment
	}
}
 
interface CompletedSamplesTableProps {
	studyID: FMSId
	step: StudySampleStep
	tableState?: CompletedSamplesTableState
	settings?: StudyUXStepSettings
	workflowAction: WorkflowActionType
}

function CompletedSamplesTable({studyID, step, workflowAction, tableState, settings} : CompletedSamplesTableProps) {
	const dispatch = useAppDispatch()

	const pageSize = settings?.pageSize ?? DEFAULT_SMALL_PAGINATION_LIMIT
	const pageNumber = tableState?.pageNumber ?? 1
	const tableKind = workflowAction === 'NEXT_STEP' ? 'completed' : 'removed'

	const onChangePageNumber = useCallback((pageNumber: number) => { dispatch(setStudyStepPageNumber(studyID, step.stepOrderID, tableKind, pageNumber)) }, [dispatch, studyID, step.stepOrderID, tableKind])
	const onChangePageSize = useCallback((pageSize: number) => { dispatch(setStudyStepPageSize(studyID, step.stepOrderID, pageSize)) }, [dispatch, studyID, step.stepOrderID])

	const dataSource = step[tableKind].samples
	const total = step[tableKind].count

	return (
	<>
		<Table 
			columns={[
				SOURCE_SAMPLE,
				GENERATED_SAMPLE,
				PROCESS_ID,
				PROCESS_MEASUREMENT_ID,
				EXECUTION_DATE,
				USER,
				COMMENT
			]}
			dataSource={dataSource}
			rowKey={completedSample => completedSample.id}
			pagination={false}
			loading={tableState?.isFetching}
		/>
		<Pagination
			className="ant-table-pagination ant-table-pagination-right"
			showSizeChanger={true}
			showQuickJumper={true}
			showTotal={(total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`}
			current={pageNumber}
			pageSize={pageSize}
			total={total}
			onChange={(newPageNumber: number, newPageSize: number) => {
				if (pageSize !== newPageSize) {
					onChangePageNumber(1)
				} else {
					onChangePageNumber(newPageNumber)
				}
			}}
			onShowSizeChange={(current, newPageSize) => {
				onChangePageSize(newPageSize)
			}}
		/>
	</>)
}

export default CompletedSamplesTable
