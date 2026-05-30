import React, { useEffect, useState } from 'react'

import { Empty, Table } from 'antd'
import { Link } from 'react-router-dom'

import api, { withToken } from '../../utils/api'
import { useAppSelector } from '../../hooks'
import { selectAuthTokenAccess } from '../../selectors'
import { FMSSample } from '../../models/fms_api_models'

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

const sampleColumnsFMS = [
	{
		title: 'Name',
		dataIndex: 'name',
		key: 'name',
		render: (name: string, sample: FMSSample) => <Link to={`/samples/${sample.id}`}>{name}</Link>,
	},
	{
		title: 'Alias',
		dataIndex: 'alias',
		key: 'alias',
	},
	{
		title: 'Sample ID',
		dataIndex: 'id',
		key: 'id',
	},
	{
		title: 'Biosample ID',
		dataIndex: 'biosample_id',
		key: 'biosample_id',
	},
	{
		title: 'Project ID',
		dataIndex: 'project',
		key: 'project',
	},
	{
		title: 'Container',
		dataIndex: 'container',
		key: 'container',
	},
	{
		title: 'Coordinate',
		dataIndex: 'coordinate',
		key: 'coordinate',
	},
	{
		title: 'Individual',
		dataIndex: 'individual',
		key: 'individual',
	},
	{
		title: 'Sample Kind',
		dataIndex: 'sample_kind',
		key: 'sample_kind',
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
		render: (concentration?: number | null) => (concentration != null ? concentration.toFixed(3) : ''),
	},
	{
		title: 'Quantity',
		key: 'quantity',
		align: 'right' as const,
		render: (_: unknown, sample: FMSSample) =>
			sample.volume != null && sample.concentration != null ? (sample.volume * sample.concentration).toFixed(1) : '',
	},
	{
		title: 'Creation Date',
		dataIndex: 'creation_date',
		key: 'creation_date',
		render: (creationDate?: string | null) =>
			creationDate
				? new Date(creationDate).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					})
				: '',
	},
	{
		title: 'Created At',
		dataIndex: 'created_at',
		key: 'created_at',
		render: (createdAt?: string | null) => (createdAt ? new Date(createdAt).toLocaleString('en-US') : ''),
	},
	{
		title: 'Updated At',
		dataIndex: 'updated_at',
		key: 'updated_at',
		render: (updatedAt?: string | null) => (updatedAt ? new Date(updatedAt).toLocaleString('en-US') : ''),
	},
	{
		title: 'Depleted',
		dataIndex: 'depleted',
		key: 'depleted',
		render: (depleted?: boolean) => (depleted ? 'Yes' : 'No'),
	},
	{
		title: 'Is Library',
		dataIndex: 'is_library',
		key: 'is_library',
		render: (isLibrary?: boolean) => (isLibrary ? 'Yes' : 'No'),
	},
	{
		title: 'Is Pool',
		dataIndex: 'is_pool',
		key: 'is_pool',
		render: (isPool?: boolean) => (isPool ? 'Yes' : 'No'),
	},
	{
		title: 'Review State',
		key: 'review_state',
		render: (_: unknown, sample: FMSSample) => {
			const flags = [sample.quality_flag, sample.quantity_flag, sample.identity_flag].filter((flag) => flag != null)

			if (flags.length === 0) {
				return ''
			}

			return flags.every(Boolean) ? 'Passed' : 'Review'
		},
	},
	{
		title: 'Process Measurements',
		dataIndex: 'process_measurements',
		key: 'process_measurements',
		render: (processMeasurements?: number[]) => processMeasurements?.join(', ') ?? '',
	},
	{
		title: 'Comment',
		dataIndex: 'comment',
		key: 'comment',
	},
]

const sampleColumns = [
	{
		title: 'Name',
		dataIndex: 'name',
		key: 'name',
		render: (name: string, sample: FMSSample) => <Link to={`/samples/${sample.id}`}>{name}</Link>,
	},
	{
		title: 'Alias',
		dataIndex: 'alias',
		key: 'alias',
	},
	{
		title: 'Barcode',
		dataIndex: 'container',
		key: 'barcode',
		render: () => '',
	},
	{
		title: 'Cohort',
		dataIndex: 'individual',
		key: 'cohort',
		render: () => '',
	},
	{
		title: 'Reception Date',
		dataIndex: 'creation_date',
		key: 'reception_date',
		render: (creationDate: string) =>
			creationDate
				? new Date(creationDate).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					})
				: '',
	},
	{
		title: 'Extraction Date',
		key: 'extraction_date',
		render: () => '',
	},
	{
		title: 'Source',
		dataIndex: 'collection_site',
		key: 'source',
	},
	{
		title: 'Submission Type',
		dataIndex: 'comment',
		key: 'submission_type',
	},
	{
		title: 'Species',
		dataIndex: 'experimental_group',
		key: 'species',
		render: (groups?: string[]) => groups?.join(', ') ?? '',
	},
	{
		title: 'Volume (uL)',
		dataIndex: 'volume',
		key: 'volume',
		align: 'right' as const,
	},
	{
		title: 'Reception Concent. (ng/uL)',
		key: 'reception_concentration',
		align: 'right' as const,
		render: () => '',
	},
	{
		title: 'Measured Concent. (ng/uL)',
		dataIndex: 'concentration',
		key: 'measured_concentration',
		align: 'right' as const,
		render: (concentration?: number) => (concentration != null ? concentration.toFixed(3) : ''),
	},
	{
		title: 'Quantity (ng)',
		key: 'quantity',
		align: 'right' as const,
		render: (_: unknown, sample: FMSSample) =>
			sample.volume != null && sample.concentration != null ? (sample.volume * sample.concentration).toFixed(1) : '',
	},
	{
		title: 'RIN',
		key: 'rin',
		align: 'right' as const,
		render: () => '',
	},
	{
		title: 'Review State',
		key: 'review_state',
		render: (_: unknown, sample: FMSSample) => {
			const flags = [sample.quality_flag, sample.quantity_flag, sample.identity_flag].filter((flag) => flag != null)

			if (flags.length === 0) {
				return ''
			}

			return flags.every(Boolean) ? 'Passed' : 'Review'
		},
	},
	{
		title: 'Number of Reads NextSeq',
		key: 'number_of_reads_nextseq',
		align: 'right' as const,
		render: () => '',
	},
	{
		title: 'Quote(s)',
		key: 'quotes',
		render: () => '',
	},
	{
		title: 'Validity',
		key: 'validity',
		render: () => '',
	},
]

const ProjectSamplesTab = ({ projectIds, hasSearched, isActive }: ProjectSamplesTabProps) => {
	const [samples, setSamples] = useState<FMSSample[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const token = useAppSelector(selectAuthTokenAccess)

	useEffect(() => {
		if (!hasSearched || !isActive || projectIds.length === 0) {
			setSamples([])
			setError(null)
			return
		}

		setIsLoading(true)
		setError(null)

		withToken(
			token,
			api.samples.list,
		)({
			derived_by_samples__project__id__in: projectIds.join(','),
			limit: 100000,
		})
			.then((response) => {
				setSamples(response.data.results)
				console.log(response.data.results)
			})
			.catch(() => {
				setSamples([])
				setError('Unable to fetch associated samples')
			})
			.finally(() => {
				setIsLoading(false)
			})
	}, [hasSearched, isActive, projectIds, token])

	if (error) {
		return <Empty description={error} />
	}
	return (
		<>
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
