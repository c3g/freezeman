import React, { useEffect, useState } from 'react'

import { Empty, Table } from 'antd'
import { Link } from 'react-router-dom'
import { ExternalIDProjectSample, ExternalIDProjectSamplesResponse, ExternalIDProjectSamplesSummary } from './types'
import ExternalIDSamplesDashboard from './ExternalIDSamplesDashboard'

/*
ProjectSamplesTab reçoit projectIds
ProjectSamplesTab fetch les samples associés a ces ids
ProjectSamplesTab garde les samples dans un state local
ProjectSamplesTab affiche <Table /> de Ant Design
*/

interface ProjectSamplesTabProps {
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
const mockSamples: ExternalIDProjectSample[] = [
	{
		id: 1,
		external_id: 'EXT-001',
		project_id: 101,
		project_name: 'RNA Project A',
		name: 'Sample A',
		alias: ['A-001', 'RNA-A'],
		container: 'BC-0001',
		individual: ['IND-001'],
		creation_date: '2025-01-15',
		collection_site: ['Blood'],
		comment: 'RNA extraction',
		experimental_group: ['Human'],
		volume: 25,
		concentration: 12.345,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 12500000,
		last_process_id: 501,
		last_process_name: 'Extraction',
		last_process_execution_date: '2025-01-18',
	},
	{
		id: 2,
		external_id: 'EXT-002',
		project_id: 101,
		project_name: 'RNA Project A',
		name: 'Sample B',
		alias: ['B-002'],
		container: 'BC-0002',
		individual: ['IND-002'],
		creation_date: '2025-02-03',
		collection_site: ['Tissue'],
		comment: 'Low concentration',
		experimental_group: ['Mouse'],
		volume: 18,
		concentration: 8.76,
		quality_flag: true,
		quantity_flag: false,
		identity_flag: true,
		number_of_reads: 8600000,
		last_process_id: 502,
		last_process_name: 'Sequencing',
		last_process_execution_date: '2025-02-06',
	},
	{
		id: 3,
		external_id: 'EXT-003',
		project_id: 102,
		project_name: 'DNA Project B',
		name: 'Sample C',
		alias: [],
		container: null,
		individual: ['IND-003', 'IND-004'],
		creation_date: null,
		collection_site: ['Saliva'],
		comment: null,
		experimental_group: ['Human', 'Control'],
		volume: null,
		concentration: null,
		quality_flag: null,
		quantity_flag: null,
		identity_flag: null,
		number_of_reads: 0,
		last_process_id: null,
		last_process_name: null,
		last_process_execution_date: null,
	},
]

const fetchProjectSamples = (projectIds: readonly number[]) =>
	new Promise<{ data: ExternalIDProjectSamplesResponse }>((resolve) => {
		window.setTimeout(() => {
			resolve({
				data: {
					external_id: 'EXT-001',
					count: mockSamples.length,
					summary: {
						total_samples: mockSamples.length,
						qc_passed_count: mockSamples.filter((s) => s.quality_flag === true).length,
						qc_review_count: mockSamples.filter((s) => s.quality_flag === false).length,
						missing_qc_count: mockSamples.filter((s) => s.quality_flag == null).length,
						with_process_count: mockSamples.filter((s) => s.last_process_id != null).length,
						without_process_count: mockSamples.filter((s) => s.last_process_id == null).length,
						process_coverage_percent: (mockSamples.filter((s) => s.last_process_id != null).length / mockSamples.length) * 100,
						total_quantity: mockSamples.reduce((sum, s) => {
							const quantity = s.volume != null && s.concentration != null ? s.volume * s.concentration : 0
							return sum + quantity
						}, 0),
						avg_concentration: mockSamples.reduce((sum, s) => sum + (s.concentration ?? 0), 0) / mockSamples.length,
						total_reads: mockSamples.reduce((sum, s) => sum + s.number_of_reads, 0),
						avg_reads_per_sample: mockSamples.reduce((sum, s) => sum + s.number_of_reads, 0) / mockSamples.length,
					},
					samples: mockSamples.map((sample, index) => ({
						...sample,
						project: projectIds[index % projectIds.length],
					})),
				},
			})
		}, 500)
	})

const ProjectSamplesTab = ({ projectIds, hasSearched, isActive }: ProjectSamplesTabProps) => {
	const [samples, setSamples] = useState<ExternalIDProjectSample[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!hasSearched || !isActive || projectIds.length === 0) {
			setSamples([])
			setError(null)
			return
		}

		setIsLoading(true)
		setError(null)

		let isCancelled = false

		fetchProjectSamples(projectIds)
			.then((response) => {
				if (isCancelled) return

				setSamples(response.data.samples)
			})
			.catch(() => {
				if (isCancelled) return

				setSamples([])
				setError('Unable to fetch associated samples')
			})
			.finally(() => {
				if (isCancelled) return

				setIsLoading(false)
			})

		return () => {
			isCancelled = true
		}
	}, [hasSearched, isActive, projectIds])

	if (error) {
		return <Empty description={error} />
	}

	const test: ExternalIDProjectSamplesSummary = {
		total_samples: 28,

		qc_passed_count: 20,
		qc_review_count: 2,
		missing_qc_count: 6,

		with_process_count: 15,
		without_process_count: 13,
		process_coverage_percent: 53.6,

		total_quantity: 58,
		avg_concentration: 28.25,

		total_reads: 125386,
		avg_reads_per_sample: 158,
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
				pagination={{
					pageSize: 20,
					showSizeChanger: true,
					pageSizeOptions: ['20', '50', '100'],
					showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
				}}
			/>
		</>
	)
}

export default ProjectSamplesTab
