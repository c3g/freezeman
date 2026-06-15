import React, { useEffect } from 'react'
import { useState } from 'react'
import { ProjectOverviewExportButtonData, ProjectOverviewReadset } from './types'
import ExternalIDReadSetDashboard from './ExternalIDReadSetDashboard'
import api from '../../utils/api'
import { useAppDispatch } from '../../hooks'

import type { ColumnsType } from 'antd/es/table'
import { Spin, Table, Tag, Typography } from 'antd'
import ProjectOverviewExportButton from './ProjectOverviewExportButton'
import { useCreateCsvExportFunction } from './useCsvExport'

const { Text } = Typography

interface ProjectReadSetsTabProps {
	externalID: string
	hasSearched: boolean
	isActive: boolean
}
const compactHeaderCell = () => ({
	style: {
		padding: '4px 8px',
		lineHeight: '16px',
		height: 20,
	},
})

const nowrapCell = {
	style: {
		whiteSpace: 'nowrap',
	},
}

const projectOverviewReadsetColumns: ColumnsType<ProjectOverviewReadset> = [
	{
		title: 'ID',
		dataIndex: 'id',
		key: 'id',
		//fixed: 'left',
		width: 70,
		onHeaderCell: compactHeaderCell,
		onCell: () => nowrapCell,
		render: (id: number) => <Text code>{id}</Text>,
	},
	{
		title: 'Readset',
		dataIndex: 'name',
		key: 'name',
		//fixed: 'left',
		width: 450,
		onHeaderCell: compactHeaderCell,
		render: (name: string) => <Text strong>{name}</Text>,
	},
	{
		title: 'Sample',
		dataIndex: 'readset_sample_name',
		key: 'readset_sample_name',
		width: 450,
		onHeaderCell: compactHeaderCell,
	},
	{
		title: 'Alias',
		dataIndex: 'alias',
		key: 'alias',
		width: 450,
		onHeaderCell: compactHeaderCell,
		render: (alias: string | null) => alias || <Text type="secondary">N/A</Text>,
	},
	{
		title: 'Cohort',
		dataIndex: 'cohort',
		key: 'cohort',
		width: 120,
		onHeaderCell: compactHeaderCell,
		render: (cohort: string | null) => cohort || <Text type="secondary">N/A</Text>,
	},
	{
		title: 'Library Type',
		dataIndex: 'library_type',
		key: 'library_type',
		width: 140,
		onHeaderCell: compactHeaderCell,
		render: (libraryType: string | null) => (libraryType ? <Tag>{libraryType}</Tag> : <Text type="secondary">N/A</Text>),
	},
	{
		title: 'Run',
		dataIndex: 'run_name',
		key: 'run_name',
		width: 260,
		onHeaderCell: compactHeaderCell,
	},
	{
		title: 'Run Start',
		dataIndex: 'run_start_date',
		key: 'run_start_date',
		width: 120,
		onHeaderCell: compactHeaderCell,
	},
	// {
	// 	title: 'Barcodes',
	// 	dataIndex: 'barcodes',
	// 	key: 'barcodes',
	// 	width: 280,
	// 	onHeaderCell: compactHeaderCell,
	// 	render: (barcodes: string[]) =>
	// 		barcodes?.length ? (
	// 			<Space size={[0, 4]} wrap>
	// 				{barcodes.map((barcode) => (
	// 					<Tag key={barcode}>{barcode}</Tag>
	// 				))}
	// 			</Space>
	// 		) : (
	// 			<Text type="secondary">N/A</Text>
	// 		),
	// },
	{
		title: 'Reads',
		dataIndex: 'number_of_reads',
		key: 'number_of_reads',
		align: 'right',
		width: 180,
		onHeaderCell: compactHeaderCell,
		render: (reads: number | null) => (reads !== null ? reads.toLocaleString() : <Text type="secondary">N/A</Text>),
	},
	{
		title: 'Avg Quality',
		dataIndex: 'average_quality',
		key: 'average_quality',
		align: 'right',
		width: 100,
		onHeaderCell: compactHeaderCell,
		render: (value: string | null) => (value !== null ? Number(value).toFixed(2) : <Text type="secondary">N/A</Text>),
	},
	{
		title: '% PF Aligned',
		dataIndex: 'pf_reads_aligned',
		key: 'pf_reads_aligned',
		align: 'right',
		width: 100,
		onHeaderCell: compactHeaderCell,
		render: (value: string | null) => (value !== null ? `${(Number(value) * 100).toFixed(2)}` : <Text type="secondary">N/A</Text>),
	},
	{
		title: '% Duplicate',
		dataIndex: 'duplicate_aligned',
		key: 'duplicate_aligned',
		align: 'right',
		width: 100,
		onHeaderCell: compactHeaderCell,
		render: (value: string | null) => (value !== null ? `${(Number(value) * 100).toFixed(2)}` : <Text type="secondary">N/A</Text>),
	},
	{
		title: 'Readset Files',
		dataIndex: 'readset_file_paths',
		key: 'readset_file_paths',
		onHeaderCell: compactHeaderCell,
		render: (files?: string[] | null) =>
			files?.length ? (
				<div style={{ whiteSpace: 'nowrap' }}>
					{files.map((file, index) => (
						<div key={`${file}-${index}`}>{file}</div>
					))}
				</div>
			) : (
				<Text type="secondary">N/A</Text>
			),
	},
	{
		title: 'Readset File Sizes (MB)',
		dataIndex: 'readset_file_sizes',
		key: 'readset_file_sizes',
		align: 'right',
		width: 120,
		onHeaderCell: compactHeaderCell,
		render: (sizes?: number[] | null) =>
			sizes?.length ? (
				sizes.map((size) => `${(Number(size) / 1024 / 1024).toFixed(2)}`).join(', ')
			) : (
				<Text type="secondary">N/A</Text>
			),
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

	const generateCsvContent = useCreateCsvExportFunction(projectOverviewReadsets)

	if (isLoading) {
		return <Spin />
	}

	if (error) {
		return <div>Error: {error}</div>
	}

	const exportButtonData: ProjectOverviewExportButtonData = {
		exportType: 'Project Readsets',
		exportFunction: generateCsvContent,
		filename: 'Project Readsets',
		itemsCount: projectOverviewReadsets.length,
		disabled: projectOverviewReadsets.length === 0,
	}

	return (
		<>
			{!isLoading && projectOverviewReadsets.length > 0 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<ProjectOverviewExportButton data={exportButtonData} />
				</div>
			)}
			{!isLoading && hasSearched && isActive && <ExternalIDReadSetDashboard readsets={projectOverviewReadsets} />}

			{projectOverviewReadsets.length > 0 ? (
				<Table
					dataSource={projectOverviewReadsets}
					columns={projectOverviewReadsetColumns}
					rowKey="id"
					size="small"
					bordered
					scroll={{ x: 'max-content', y: 400 }}
					pagination={{
						pageSize: 5,
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
