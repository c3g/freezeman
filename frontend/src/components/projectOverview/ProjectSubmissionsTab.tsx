import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Project } from '../../models/frontend_models'
import ExternalIDProjectsDashboard from './ExternalIDProjectDashboard'
import { Empty, Table } from 'antd'
import { Link } from 'react-router-dom'

import { fetchProjects } from '../../modules/cache/cache'

import ExportButton from '../ExportButton'

import { formatProjectSubmissionRows, csvEscape } from './utils'

interface ProjectSubmissionsTabProps {
	projectIds: readonly number[]
	hasSearched: boolean
	searchedExternalID: string
}

const submissionColumns = [
	{
		title: 'ID',
		dataIndex: 'id',
		key: 'id',
		render: (id: number) => <Link to={`/projects/${id}#overview`}>{id}</Link>,
	},
	{
		title: 'Project Submissions Names',
		dataIndex: 'name',
		key: 'name',
		render: (name: string, project: Project) => <Link to={`/projects/${project.id}#overview`}>{name}</Link>,
	},
	{
		title: 'External ID',
		dataIndex: 'external_id',
		key: 'external_id',
	},
	{
		title: 'Principal Investigator',
		dataIndex: 'principal_investigator',
		key: 'principal_investigator',
	},
	{
		title: 'Requestor Name',
		dataIndex: 'requestor_name',
		key: 'requestor_name',
	},
	{
		title: 'Status',
		dataIndex: 'status',
		key: 'status',
	},
	{
		title: 'Created At',
		dataIndex: 'created_at',
		key: 'created_at',
		render: (createdAt: string) =>
			createdAt
				? new Date(createdAt).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					})
				: '',
	},
]

const ProjectSubmissionsTab = ({ projectIds, hasSearched, searchedExternalID }: ProjectSubmissionsTabProps) => {
	const [projects, setProjects] = useState<Project[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Export Operations
	// a- Prepare headers and rows for export
	const headers = useMemo(
		() => ['ID', 'Project Submissions Names', 'External ID', 'Principal Investigator', 'Requestor Name', 'Status', 'Created At'],
		[],
	)

	const exportFields: Array<keyof Project> = [
		'id',
		'name',
		'external_id',
		'principal_investigator',
		'requestor_name',
		'status',
		'created_at',
	]

	const rows = formatProjectSubmissionRows(projects, exportFields)

	//b- Create export function that generates CSV content
	const listExport = useCallback(() => {
		headers
		rows
		const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n')

		return Promise.resolve(csv)
	}, [headers, rows])

	//c- Prepare export button data
	const exportButtonData = {
		exportType: 'Project Submissions',
		exportFunction: listExport,
		filename: 'project_submissions',
		itemsCount: projects.length,
		disabled: projects.length === 0,
	}

	// End of Export Operations

	useEffect(() => {
		if (!hasSearched || projectIds.length === 0) {
			setProjects([])
			setError(null)
			return
		}

		setIsLoading(true)
		setError(null)

		fetchProjects(projectIds)
			.then((fetchedProjects) => {
				setProjects(fetchedProjects)
			})
			.catch(() => {
				setProjects([])
				setError('Unable to fetch project submissions')
			})
			.finally(() => {
				setIsLoading(false)
			})
	}, [projectIds, hasSearched])

	if (!hasSearched) {
		return <Empty description="Search a project external ID to view submissions" />
	}
	if (!isLoading && projects.length === 0) {
		return <Empty description={`No project submissions found for ${searchedExternalID}`} />
	}

	if (error) {
		return <Empty description={error} />
	}

	return (
		<>
			{!isLoading && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<ExportButton
						exportType={exportButtonData.exportType}
						exportFunction={exportButtonData.exportFunction}
						filename={exportButtonData.filename}
						itemsCount={exportButtonData.itemsCount}
						disabled={exportButtonData.disabled}
					/>
				</div>
			)}
			{!isLoading && <ExternalIDProjectsDashboard data={projects} />}

			<Table
				size="small"
				bordered
				rowKey="id"
				dataSource={projects}
				columns={submissionColumns}
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

export default ProjectSubmissionsTab
