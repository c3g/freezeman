import React, { useEffect } from 'react'
import { useState } from 'react'
import { ProjectOverviewReadset } from './types'
import ExternalIDReadSetDashboard from './ExternalIDReadSetDashboard'
import api from '../../utils/api'
import { useAppDispatch } from '../../hooks'

import type { ColumnsType } from 'antd/es/table'
import { Table, Tag, Typography } from 'antd'

const { Text } = Typography

interface ProjectReadSetsTabProps {
	externalID: string
	hasSearched: boolean
	isActive: boolean
}
const compactHeaderCell = () => ({
	style: {
		padding: '4px 8px',
		lineHeight: '8px',
		height: 16,
	},
})

const projectOverviewReadsetColumns: ColumnsType<ProjectOverviewReadset> = [
	{
		title: 'ID',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'id',
		key: 'id',
		fixed: 'left',
		width: 90,
		render: (id: number) => <Text code>{id}</Text>,
	},
	{
		title: 'Readset',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'name',
		key: 'name',
		fixed: 'left',
		width: 300,
		render: (name: string) => <Text strong>{name}</Text>,
	},
	{
		title: 'Sample',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'readset_sample_name',
		key: 'readset_sample_name',
		width: 250,
	},
	// {
	// 	title: 'Alias',
	// 	onHeaderCell: compactHeaderCell,
	// 	dataIndex: 'alias',
	// 	key: 'alias',
	// 	width: 220,
	// 	render: (alias: string | null) => alias || <Text type="secondary">N/A</Text>,
	// },
	// {
	// 	title: 'Cohort',
	//	onHeaderCell: compactHeaderCell,
	// 	dataIndex: 'cohort',
	// 	key: 'cohort',
	// 	width: 80,
	// 	render: (cohort: string | null) => cohort || <Text type="secondary">N/A</Text>,
	// },
	{
		title: 'Library Type',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'library_type',
		key: 'library_type',
		width: 120,
		render: (libraryType: string | null) => (libraryType ? <Tag>{libraryType}</Tag> : <Text type="secondary">N/A</Text>),
	},
	{
		title: 'Run',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'run_name',
		key: 'run_name',
		width: 220,
	},
	{
		title: 'Run Start',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'run_start_date',
		key: 'run_start_date',
		width: 100,
	},
	// {
	// 	title: 'Barcodes',
	//	onHeaderCell: compactHeaderCell,
	// 	dataIndex: 'barcodes',
	// 	key: 'barcodes',
	// 	width: 260,
	// 	render: (barcodes: string[]) =>
	// 		barcodes.length ? barcodes.map((barcode) => <Tag key={barcode}>{barcode}</Tag>) : <Text type="secondary">N/A</Text>,
	// },
	{
		title: 'Reads',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'number_of_reads',
		key: 'number_of_reads',
		align: 'right',
		width: 100,
		render: (reads: number | null) => (reads !== null ? reads.toLocaleString() : <Text type="secondary">N/A</Text>),
	},
	{
		title: 'Avg Quality',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'average_quality',
		key: 'average_quality',
		align: 'right',
		width: 100,
		render: (value: string | null) => (value !== null ? Number(value).toFixed(2) : <Text type="secondary">N/A</Text>),
	},
	{
		title: '% PF Aligned',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'pf_reads_aligned',
		key: 'pf_reads_aligned',
		align: 'right',
		width: 120,
		render: (value: string | null) => (value !== null ? `${(Number(value) * 100).toFixed(2)}%` : <Text type="secondary">N/A</Text>),
	},
	{
		title: '% Duplicate',
		onHeaderCell: compactHeaderCell,
		dataIndex: 'duplicate_aligned',
		key: 'duplicate_aligned',
		align: 'right',
		width: 100,
		render: (value: string | null) => (value !== null ? `${(Number(value) * 100).toFixed(2)}%` : <Text type="secondary">N/A</Text>),
	},
]

function ProjectReadSetsTab({ externalID, hasSearched, isActive }: ProjectReadSetsTabProps) {
	const [projectOverviewReadsets, setProjectOverviewReadsets] = useState<ProjectOverviewReadset[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const dispatch = useAppDispatch()

	useEffect(() => {
		async function fetchReadsets() {
			try {
				setIsLoading(true)
				setError(null)

				const response = await dispatch(
					api.projectOverview.readsets({
						external_id: externalID,
						limit: 100,
					}),
				)
				setProjectOverviewReadsets(response.data.results)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch read sets')
			} finally {
				setIsLoading(false)
			}
		}

		if (isActive && hasSearched) {
			fetchReadsets()
		}
	}, [externalID, hasSearched, isActive, dispatch])

	console.log('Current read sets state:', projectOverviewReadsets)

	if (isLoading) {
		return <div>Loading read sets...</div>
	}

	if (error) {
		return <div>Error: {error}</div>
	}
	return (
		<>
			{!isLoading && hasSearched && isActive && <ExternalIDReadSetDashboard readsets={projectOverviewReadsets} />}

			{projectOverviewReadsets.length > 0 ? (
				<Table
					dataSource={projectOverviewReadsets}
					columns={projectOverviewReadsetColumns}
					rowKey="id"
					size="small"
					bordered
					// scroll={{ x: 1800 }}
					pagination={{
						pageSize: 3,
						showSizeChanger: true,
					}}
				/>
			) : (
				<div>No read sets found for External ID: {externalID}</div>
			)}
		</>
	)
}

export default ProjectReadSetsTab
