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
		project_id: 102,
		project_name: 'DNA Project B',
		name: 'Sample B',
		alias: ['B-001'],
		container: 'BC-0002',
		individual: ['IND-002'],
		creation_date: '2025-01-20',
		collection_site: ['Saliva'],
		comment: 'DNA isolation',
		experimental_group: ['Control'],
		volume: 30,
		concentration: 15.678,
		quality_flag: true,
		quantity_flag: false,
		identity_flag: true,
		number_of_reads: 9800000,
		last_process_id: 502,
		last_process_name: 'Sequencing',
		last_process_execution_date: '2025-01-25',
	},
	{
		id: 3,
		external_id: 'EXT-003',
		project_id: 103,
		project_name: 'Cancer Study',
		name: 'Sample C',
		alias: ['C-001'],
		container: 'BC-0003',
		individual: ['IND-003'],
		creation_date: '2025-02-01',
		collection_site: ['Tumor'],
		comment: 'Biopsy sample',
		experimental_group: ['Patient'],
		volume: 18,
		concentration: 8.921,
		quality_flag: false,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 14300000,
		last_process_id: 503,
		last_process_name: 'Alignment',
		last_process_execution_date: '2025-02-05',
	},
	{
		id: 4,
		external_id: 'EXT-004',
		project_id: 104,
		project_name: 'Microbiome',
		name: 'Sample D',
		alias: ['D-001'],
		container: 'BC-0004',
		individual: ['IND-004'],
		creation_date: '2025-02-10',
		collection_site: ['Stool'],
		comment: 'Microbiome profiling',
		experimental_group: ['Human'],
		volume: 22,
		concentration: 11.432,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: false,
		number_of_reads: 7600000,
		last_process_id: 504,
		last_process_name: 'QC',
		last_process_execution_date: '2025-02-12',
	},
	{
		id: 5,
		external_id: 'EXT-005',
		project_id: 105,
		project_name: 'Plant Genomics',
		name: 'Sample E',
		alias: ['E-001'],
		container: 'BC-0005',
		individual: ['IND-005'],
		creation_date: '2025-02-15',
		collection_site: ['Leaf'],
		comment: 'Leaf extraction',
		experimental_group: ['Plant'],
		volume: 40,
		concentration: 18.654,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 21000000,
		last_process_id: 505,
		last_process_name: 'Extraction',
		last_process_execution_date: '2025-02-17',
	},
	{
		id: 6,
		external_id: 'EXT-006',
		project_id: 106,
		project_name: 'RNA Project A',
		name: 'Sample F',
		alias: ['F-001'],
		container: 'BC-0006',
		individual: ['IND-006'],
		creation_date: '2025-02-20',
		collection_site: ['Blood'],
		comment: 'Follow-up sample',
		experimental_group: ['Human'],
		volume: 27,
		concentration: 13.782,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 15400000,
		last_process_id: 506,
		last_process_name: 'Sequencing',
		last_process_execution_date: '2025-02-23',
	},
	{
		id: 7,
		external_id: 'EXT-007',
		project_id: 107,
		project_name: 'Virus Study',
		name: 'Sample G',
		alias: ['G-001'],
		container: 'BC-0007',
		individual: ['IND-007'],
		creation_date: '2025-03-01',
		collection_site: ['Nasal Swab'],
		comment: 'PCR validation',
		experimental_group: ['Patient'],
		volume: 12,
		concentration: 5.432,
		quality_flag: false,
		quantity_flag: false,
		identity_flag: true,
		number_of_reads: 4300000,
		last_process_id: 507,
		last_process_name: 'PCR',
		last_process_execution_date: '2025-03-02',
	},
	{
		id: 8,
		external_id: 'EXT-008',
		project_id: 108,
		project_name: 'Proteomics',
		name: 'Sample H',
		alias: ['H-001'],
		container: 'BC-0008',
		individual: ['IND-008'],
		creation_date: '2025-03-05',
		collection_site: ['Serum'],
		comment: 'Protein extraction',
		experimental_group: ['Control'],
		volume: 35,
		concentration: 21.001,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 17800000,
		last_process_id: 508,
		last_process_name: 'QC',
		last_process_execution_date: '2025-03-08',
	},
	{
		id: 9,
		external_id: 'EXT-009',
		project_id: 109,
		project_name: 'Metagenomics',
		name: 'Sample I',
		alias: ['I-001'],
		container: 'BC-0009',
		individual: ['IND-009'],
		creation_date: '2025-03-10',
		collection_site: ['Water'],
		comment: 'Environmental sample',
		experimental_group: ['Environmental'],
		volume: 50,
		concentration: 7.891,
		quality_flag: true,
		quantity_flag: false,
		identity_flag: true,
		number_of_reads: 12000000,
		last_process_id: 509,
		last_process_name: 'Extraction',
		last_process_execution_date: '2025-03-12',
	},
	{
		id: 10,
		external_id: 'EXT-010',
		project_id: 110,
		project_name: 'Cancer Study',
		name: 'Sample J',
		alias: ['J-001'],
		container: 'BC-0010',
		individual: ['IND-010'],
		creation_date: '2025-03-15',
		collection_site: ['Tumor'],
		comment: 'Metastatic tissue',
		experimental_group: ['Patient'],
		volume: 15,
		concentration: 9.654,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: false,
		number_of_reads: 16500000,
		last_process_id: 510,
		last_process_name: 'Alignment',
		last_process_execution_date: '2025-03-18',
	},
	{
		id: 11,
		external_id: 'EXT-011',
		project_id: 111,
		project_name: 'RNA Project B',
		name: 'Sample K',
		alias: ['K-001'],
		container: 'BC-0011',
		individual: ['IND-011'],
		creation_date: '2025-03-20',
		collection_site: ['Blood'],
		comment: 'Expression analysis',
		experimental_group: ['Human'],
		volume: 28,
		concentration: 14.321,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 13200000,
		last_process_id: 511,
		last_process_name: 'Sequencing',
		last_process_execution_date: '2025-03-22',
	},
	{
		id: 12,
		external_id: 'EXT-012',
		project_id: 112,
		project_name: 'Plant Genomics',
		name: 'Sample L',
		alias: ['L-001'],
		container: 'BC-0012',
		individual: ['IND-012'],
		creation_date: '2025-04-01',
		collection_site: ['Root'],
		comment: 'Root tissue',
		experimental_group: ['Plant'],
		volume: 33,
		concentration: 17.123,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 20100000,
		last_process_id: 512,
		last_process_name: 'Extraction',
		last_process_execution_date: '2025-04-03',
	},
	{
		id: 13,
		external_id: 'EXT-013',
		project_id: 113,
		project_name: 'Virus Study',
		name: 'Sample M',
		alias: ['M-001'],
		container: 'BC-0013',
		individual: ['IND-013'],
		creation_date: '2025-04-05',
		collection_site: ['Nasal Swab'],
		comment: 'Variant screening',
		experimental_group: ['Patient'],
		volume: 11,
		concentration: 4.998,
		quality_flag: false,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 3900000,
		last_process_id: 513,
		last_process_name: 'PCR',
		last_process_execution_date: '2025-04-06',
	},
	{
		id: 14,
		external_id: 'EXT-014',
		project_id: 114,
		project_name: 'Microbiome',
		name: 'Sample N',
		alias: ['N-001'],
		container: 'BC-0014',
		individual: ['IND-014'],
		creation_date: '2025-04-10',
		collection_site: ['Stool'],
		comment: 'Longitudinal study',
		experimental_group: ['Human'],
		volume: 24,
		concentration: 10.876,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 8500000,
		last_process_id: 514,
		last_process_name: 'QC',
		last_process_execution_date: '2025-04-12',
	},
	{
		id: 15,
		external_id: 'EXT-015',
		project_id: 115,
		project_name: 'Proteomics',
		name: 'Sample O',
		alias: ['O-001'],
		container: 'BC-0015',
		individual: ['IND-015'],
		creation_date: '2025-04-15',
		collection_site: ['Serum'],
		comment: 'Validation batch',
		experimental_group: ['Control'],
		volume: 31,
		concentration: 19.555,
		quality_flag: true,
		quantity_flag: false,
		identity_flag: true,
		number_of_reads: 14300000,
		last_process_id: 515,
		last_process_name: 'QC',
		last_process_execution_date: '2025-04-17',
	},
	{
		id: 16,
		external_id: 'EXT-016',
		project_id: 116,
		project_name: 'Metagenomics',
		name: 'Sample P',
		alias: ['P-001'],
		container: 'BC-0016',
		individual: ['IND-016'],
		creation_date: '2025-04-20',
		collection_site: ['Soil'],
		comment: 'Agricultural field',
		experimental_group: ['Environmental'],
		volume: 45,
		concentration: 6.543,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: false,
		number_of_reads: 10900000,
		last_process_id: 516,
		last_process_name: 'Extraction',
		last_process_execution_date: '2025-04-22',
	},
	{
		id: 17,
		external_id: 'EXT-017',
		project_id: 117,
		project_name: 'Cancer Study',
		name: 'Sample Q',
		alias: ['Q-001'],
		container: 'BC-0017',
		individual: ['IND-017'],
		creation_date: '2025-05-01',
		collection_site: ['Tumor'],
		comment: 'Relapse case',
		experimental_group: ['Patient'],
		volume: 16,
		concentration: 8.111,
		quality_flag: false,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 15700000,
		last_process_id: 517,
		last_process_name: 'Alignment',
		last_process_execution_date: '2025-05-03',
	},
	{
		id: 18,
		external_id: 'EXT-018',
		project_id: 118,
		project_name: 'RNA Project C',
		name: 'Sample R',
		alias: ['R-001'],
		container: 'BC-0018',
		individual: ['IND-018'],
		creation_date: '2025-05-05',
		collection_site: ['Blood'],
		comment: 'Transcriptomics',
		experimental_group: ['Human'],
		volume: 26,
		concentration: 13.987,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 17100000,
		last_process_id: 518,
		last_process_name: 'Sequencing',
		last_process_execution_date: '2025-05-08',
	},
	{
		id: 19,
		external_id: 'EXT-019',
		project_id: 119,
		project_name: 'Plant Genomics',
		name: 'Sample S',
		alias: ['S-001'],
		container: 'BC-0019',
		individual: ['IND-019'],
		creation_date: '2025-05-10',
		collection_site: ['Seed'],
		comment: 'Germination study',
		experimental_group: ['Plant'],
		volume: 38,
		concentration: 16.444,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 19800000,
		last_process_id: 519,
		last_process_name: 'Extraction',
		last_process_execution_date: '2025-05-12',
	},
	{
		id: 20,
		external_id: 'EXT-020',
		project_id: 120,
		project_name: 'Microbiome',
		name: 'Sample T',
		alias: ['T-001'],
		container: 'BC-0020',
		individual: ['IND-020'],
		creation_date: '2025-05-15',
		collection_site: ['Stool'],
		comment: 'Final cohort',
		experimental_group: ['Human'],
		volume: 23,
		concentration: 11.765,
		quality_flag: true,
		quantity_flag: true,
		identity_flag: true,
		number_of_reads: 9100000,
		last_process_id: 520,
		last_process_name: 'QC',
		last_process_execution_date: '2025-05-17',
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
						samples_with_assigned_process_count: mockSamples.filter((s) => s.last_process_id != null).length,
						samples_without_assigned_process_count: mockSamples.filter((s) => s.last_process_id == null).length,
						samples_assigned_to_a_process_rate:
							(mockSamples.filter((s) => s.last_process_id != null).length / mockSamples.length) * 100,
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

		samples_with_assigned_process_count: 15,
		samples_without_assigned_process_count: 13,
		samples_assigned_to_a_process_rate: 53.6,

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
