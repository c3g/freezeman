import { Table, TableColumnType } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import { CompletedStudySample } from "../../modules/studySamples/models"
import { WithSampleRenderComponent } from '../shared/WithItemRenderComponent'

type CompletedSampleColumn = TableColumnType<CompletedStudySample>

const SOURCE_SAMPLE : CompletedSampleColumn = {
	title: 'Source Sample',
	dataIndex: 'sampleID',
	render: (sampleID) => {
		return (
			<WithSampleRenderComponent objectID={sampleID} render={
				sample => <Link to={`/samples/${sample.id}`}>{sample.name}</Link>
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
		if ((comment as string).startsWith('Automatically generated on')) {
			return null
		}
		return comment
	}
}
 
interface CompletedSamplesTableProps {
	completedSamples: CompletedStudySample[]
}

function CompletedSamplesTable({completedSamples} : CompletedSamplesTableProps) {
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
		/>
			
	</>)
}

export default CompletedSamplesTable