import { Table, TableColumnType } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompletedStudySample } from "../../modules/studySamples/models"
import { WithSampleRenderComponent } from '../shared/WithItemRenderComponent'
import { fetchProcessMeasurements, fetchProcesses, fetchUsers } from '../../modules/cache/cache'
import { createItemsByID } from '../../models/frontend_models'

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
	completedSamples: CompletedStudySample[]
}

function CompletedSamplesTable({completedSamples} : CompletedSamplesTableProps) {
	const [samples, setSamples] = useState<CompletedStudySample[]>(completedSamples)
	const [loading, setLoading] = useState(true)
	const pageSize = 10

	const addOptionalFields = useCallback(async (offset: number, limit: number) => {
		function withinRange(index: number) {
			return index >= offset && index < (offset + limit)
		}

		// Get the process measurements for the completed samples
		const processMeasurementIDs = samples.filter((_, index) => withinRange(index)).map(completed => completed.processMeasurementID)
		const processMeasurements = await fetchProcessMeasurements(processMeasurementIDs)
		const processMeasurementsByID = createItemsByID(processMeasurements)

		// Get the processes for the completed samples
		const processIDs = processMeasurements.map(pm => pm.process)
		const processes = await fetchProcesses(processIDs)
		const processesByID = createItemsByID(processes)

		// Get the user ID's for the processes
		const processesUserIDs = processes.map(process => process.created_by)
		// Get the user ID's for the step history without processes
		const userIDs = processesUserIDs
		const users = await fetchUsers(userIDs)
		const usersByID = createItemsByID(users)

		setSamples((samples) => samples.map((sample, index) => {
			if (!withinRange(index)) {
				return sample
			}

			const processMeasurement = processMeasurementsByID[sample.processMeasurementID]
			const process = processMeasurement ? processesByID[processMeasurement.process] : undefined
			const userName = process && process.created_by ? usersByID[process.created_by]?.username : sample.executedBy
	
			return {
				...sample,
				generatedSampleID: processMeasurement?.child_sample,
				processID: processMeasurement?.process,
				executionDate: processMeasurement ? processMeasurement?.execution_date : sample.executionDate,
				executedBy: userName,
				comment: processMeasurement?.comment,
			}
		}))
	}, [])
	
	const onChangePageNumber = useCallback((pageNumber: number) => {
		setLoading(true)
		addOptionalFields(pageSize * (pageNumber - 1), pageSize).then(() => setLoading(false))
	}, [])

	useEffect(() => {
		addOptionalFields(0, pageSize).then(() => setLoading(false))
	}, [])

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
			dataSource={samples}
			rowKey={completedSample => completedSample.id}
			loading={loading}
			pagination={{
				onChange(page, pageSize) { onChangePageNumber(page) }
			}}
		/>
	</>)
}

export default CompletedSamplesTable