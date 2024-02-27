import { Pagination, Table, TableColumnType } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompletedStudySample, StudySampleStep, StudyUXStepSettings } from "../../modules/studySamples/models"
import { WithSampleRenderComponent } from '../shared/WithItemRenderComponent'
import { FMSId, WorkflowActionType } from '../../models/fms_api_models'
import { fetchCompletedSamples } from '../../modules/studySamples/services'
import { setStudyStepPageSize } from '../../modules/studySamples/actions'
import { useAppDispatch } from '../../hooks'

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
	settings?: StudyUXStepSettings
	workflowAction: WorkflowActionType
}

function CompletedSamplesTable({studyID, step, settings, workflowAction} : CompletedSamplesTableProps) {
	const dispatch = useAppDispatch()

	const [completedSamples, setCompletedSamples] = useState<CompletedStudySample[]>([])
	const [totalCount, setTotalCount] = useState(0)
	const [pageNumber, setPageNumber] = useState(1)
	const pageSize = settings?.pageSize ?? 10


	const onChangePageNumber = useCallback((pageNumber: number) => { setPageNumber(pageNumber) }, [pageNumber])
	const onChangePageSize = useCallback((pageSize: number) => { dispatch(setStudyStepPageSize(studyID, step.stepOrderID, pageSize)) }, [studyID, step.stepOrderID])

	useEffect(() => {
			fetchCompletedSamples(studyID, step.stepOrderID, workflowAction, pageSize, pageSize * (pageNumber - 1)).then(({ completedStudySamples, totalCount }) => {
			setCompletedSamples(completedStudySamples)
			setTotalCount(totalCount)
		})
	}, [studyID, step.stepOrderID, workflowAction, pageSize, pageNumber])

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
			dataSource={completedSamples}
			rowKey={completedSample => completedSample.id}
			pagination={false}
		/>
		<Pagination
			className="ant-table-pagination ant-table-pagination-right"
			showSizeChanger={true}
			showQuickJumper={true}
			showTotal={(total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`}
			current={pageNumber}
			pageSize={pageSize}
			total={totalCount}
			onChange={(pageNumber: number) => onChangePageNumber(pageNumber)}
			onShowSizeChange={(_: any, newPageSize: number) => onChangePageSize(newPageSize)}
		/>
	</>)
}

export default CompletedSamplesTable