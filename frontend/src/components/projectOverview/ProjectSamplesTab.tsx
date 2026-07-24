import React, { useEffect, useState } from 'react'

import { Empty, Table } from 'antd'
import { Link } from 'react-router-dom'
import { ExternalIDProjectSample, ExternalIDProjectSamplesResponse, ExternalIDProjectSamplesSummary } from './types'
import ExternalIDSamplesDashboard from './ExternalIDSamplesDashboard'
import api from '../../utils/api'
import { useAppDispatch } from '../../hooks'

/*
ProjectSamplesTab reçoit projectIds
ProjectSamplesTab fetch les samples associés a ces ids
ProjectSamplesTab garde les samples dans un state local
ProjectSamplesTab affiche <Table /> de Ant Design
*/

interface ProjectSamplesTabProps {
  externalID: string
  projectIds: readonly number[]
  hasSearched: boolean
  isActive: boolean
}

const formatDate = (date?: string | null) =>
	date
		? new Date(date).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		: ''

const sampleColumns = [
	{
		title: 'Id',
		dataIndex: 'id',
		key: 'id',
		render: (id: number) => <Link to={`/samples/${id}`}>{id}</Link>,
	},
	{
		title: 'External ID',
		dataIndex: 'external_id',
		key: 'external_id',
	},
	{
		title: 'Project Id',
		dataIndex: 'project_id',
		key: 'project_id',
		render: (projectId: number) => <Link to={`/projects/${projectId}`}>{projectId}</Link>,
	},
	{
		title: 'Project Name',
		dataIndex: 'project_name',
		key: 'project_name',
	},
	{
		title: 'Name',
		dataIndex: 'name',
		key: 'name',
		render: (name: string, sample: ExternalIDProjectSample) => <Link to={`/samples/${sample.id}`}>{name}</Link>,
	},
	{
		title: 'Alias',
		dataIndex: 'alias',
		key: 'alias',
		render: (alias: string[]) => alias?.join(', ') ?? '',
	},
	{
		title: 'Container',
		dataIndex: 'container',
		key: 'container',
	},
	{
		title: 'Individual',
		dataIndex: 'individual',
		key: 'individual',
		render: (individual: string[]) => individual?.join(', ') ?? '',
	},
	{
		title: 'Creation Date',
		dataIndex: 'creation_date',
		key: 'creation_date',
		render: formatDate,
	},
	{
		title: 'Collection Site',
		dataIndex: 'collection_site',
		key: 'collection_site',
		render: (sites: string[]) => sites?.join(', ') ?? '',
	},
	{
		title: 'Comment',
		dataIndex: 'comment',
		key: 'comment',
	},
	{
		title: 'Experimental Group',
		dataIndex: 'experimental_group',
		key: 'experimental_group',
		render: (groups: string[]) => groups?.join(', ') ?? '',
	},
	{
		title: 'Volume (uL)',
		dataIndex: 'volume',
		key: 'volume',
		align: 'right' as const,
	},
	{
		title: 'Concentration',
		dataIndex: 'concentration',
		key: 'concentration',
		align: 'right' as const,
		render: (value?: number | null) => (value != null ? value.toFixed(3) : ''),
	},
	{
		title: 'Quantity',
		key: 'quantity',
		align: 'right' as const,
		render: (_: unknown, sample: ExternalIDProjectSample) =>
			sample.volume != null && sample.concentration != null ? (sample.volume * sample.concentration).toFixed(1) : '',
	},
	{
		title: 'Review State',
		key: 'review_state',
		render: (_: unknown, sample: ExternalIDProjectSample) => {
			const flags = [sample.quality_flag, sample.quantity_flag, sample.identity_flag].filter((flag) => flag != null)

			if (flags.length === 0) return ''

			return flags.every(Boolean) ? 'Passed' : 'Review'
		},
	},
	{
		title: 'Number of Reads',
		dataIndex: 'number_of_reads',
		key: 'number_of_reads',
		align: 'right' as const,
	},
	{
		title: 'Last Process Id',
		dataIndex: 'last_process_id',
		key: 'last_process_id',
		render: (processId?: number | null) => (processId != null ? <Link to={`/processes/${processId}`}>{processId}</Link> : ''),
	},
	{
		title: 'Last Process Name',
		dataIndex: 'last_process_name',
		key: 'last_process_name',
	},
	{
		title: 'Last Process Execution Date',
		dataIndex: 'last_process_execution_date',
		key: 'last_process_execution_date',
		render: formatDate,
	},
]

const ProjectSamplesTab = ({ externalID, hasSearched, isActive }: ProjectSamplesTabProps) => {
	const [samples, setSamples] = useState<ExternalIDProjectSample[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const dispatch = useAppDispatch()

	useEffect(() => {
	async function fetchSamples() {
		try {
			setIsLoading(true)
			setError(null)

			const response = await dispatch(
				api.projectOverview.samples({
					external_id: externalID,
					limit: 100,
				}),
			)

			setSamples(response.data.results)
		} catch (err) {
			setSamples([])
			setError(err instanceof Error ? err.message : 'Failed to fetch samples')
		} finally {
			setIsLoading(false)
		}
	}

	if (isActive && hasSearched && externalID) {
		fetchSamples()
	}
}, [externalID, hasSearched, isActive, dispatch])


	if (error) {
		return <Empty description={error} />
	}

	const test: ExternalIDProjectSamplesSummary = {
		total_samples: samples.length,

		qc_passed_count: samples.filter((s) => s.quality_flag === true).length,
		qc_review_count: samples.filter((s) => s.quality_flag === false).length,
		missing_qc_count: samples.filter((s) => s.quality_flag == null).length,

		samples_with_assigned_process_count: samples.filter((s) => s.last_process_id != null).length,
		samples_without_assigned_process_count: samples.filter((s) => s.last_process_id == null).length,
		samples_assigned_to_a_process_rate:(samples.filter((s) => s.last_process_id != null).length / samples.length) * 100,

		total_quantity: samples.reduce((sum, s) => {
							const quantity = s.volume != null && s.concentration != null ? s.volume * s.concentration : 0
							return sum + quantity
						}, 0),
		avg_concentration: samples.reduce((sum, s) => sum + (s.concentration ?? 0), 0) / samples.length,
		total_reads: samples.reduce((sum, s) => sum + s.number_of_reads, 0),
		avg_reads_per_sample: samples.reduce((sum, s) => sum + s.number_of_reads, 0) / samples.length,
		
	}
	return (
		<>
			<button> Export !!!</button>

			<ExternalIDSamplesDashboard summary={test} />
			<Table
				style={{ fontSize: 10 }}
				size="small"
				bordered
				rowKey="id"
				dataSource={samples}
				columns={sampleColumns}
				loading={isLoading}
				scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
				pagination={{
					pageSize: 10,
					showSizeChanger: true,
					pageSizeOptions: ['20', '50', '100'],
					showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
				}}
			/>
		</>
	)
}

export default ProjectSamplesTab
