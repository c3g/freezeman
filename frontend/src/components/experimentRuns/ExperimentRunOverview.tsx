import React from 'react'
import { Container, ExperimentRun, Process } from '../../models/frontend_models'
import { Descriptions, Tag } from 'antd'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../hooks'
import { selectInstrumentsByID, selectRunTypesByID } from '../../selectors'
import TrackingFieldsContent from '../TrackingFieldsContent'
import dayjs from 'dayjs'

interface ExperimentRunOverviewProps {
	experimentRun: ExperimentRun
	container: Container
	process: Process
}

function formatDate(dateString : string | undefined) {
	if (dateString) {
		const date = new Date(Date.parse(dateString))
		return dayjs(date).format("YYYY-MM-DD")
	}
	return undefined
}

function ExperimentRunOverview({ experimentRun, container, process }: ExperimentRunOverviewProps) {
	const instrumentsByID = useAppSelector(selectInstrumentsByID)
	const runTypesByID = useAppSelector(selectRunTypesByID)

	return (
		<>
			<Descriptions bordered={true} size="small">
				<Descriptions.Item label="ID" span={3}>
					{experimentRun.id}
				</Descriptions.Item>
				<Descriptions.Item label="Name" span={3}>
					{experimentRun.name}
				</Descriptions.Item>
        <Descriptions.Item label="External Name" span={3}>
					{experimentRun?.external_name}
				</Descriptions.Item>
				<Descriptions.Item label="Run Type" span={3}>
					<Tag>{runTypesByID[experimentRun.run_type]?.name}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Instrument" span={3}>
					{instrumentsByID[experimentRun.instrument]?.name}
				</Descriptions.Item>
				<Descriptions.Item label="Instrument Type" span={3}>
					{experimentRun.instrument_type}
				</Descriptions.Item>
				<Descriptions.Item label="Platform" span={3}>
					{experimentRun.platform}
				</Descriptions.Item>
				<Descriptions.Item label="Experiment Start Date" span={3}>
					{experimentRun.start_date}
				</Descriptions.Item>
				<Descriptions.Item label="Container Barcode" span={3}>
					{experimentRun.container && <Link to={`/containers/${experimentRun.container}`}>{container.barcode}</Link>}
				</Descriptions.Item>
				<Descriptions.Item label="Comment" span={3}>
					{process.comment}
				</Descriptions.Item>
				<Descriptions.Item label="Launch Date" span={3}>{formatDate(experimentRun.run_processing_launch_time)}</Descriptions.Item>
				<Descriptions.Item  label="Processing Start Date" span={3}>{formatDate(experimentRun.run_processing_start_time)}</Descriptions.Item>
				<Descriptions.Item  label="Processing End Date" span={3}>{formatDate(experimentRun.run_processing_end_time)}</Descriptions.Item>
			</Descriptions>

			<TrackingFieldsContent entity={experimentRun} />
		</>
	)
}

export default ExperimentRunOverview
