import React, { useCallback, useMemo, } from 'react'

import ExternalIDProjectsDashboard from './ExternalIDProjectDashboard'
import { Empty, Table } from 'antd'
import { Link } from 'react-router-dom'


import { FMSProject } from '../../models/fms_api_models'


import { useCreateCsvExportFunction } from './useCsvExport'
import {ProjectOverviewExportButtonData} from './types'
import ProjectOverviewExportButton from './ProjectOverviewExportButton'

interface ProjectSubmissionsTabProps {
	internalProjects: FMSProject[]
	isLoading: boolean
	externalID : string
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
		render: (name: string, project: FMSProject) => <Link to={`/projects/${project.id}#overview`}>{name}</Link>,
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

const ProjectSubmissionsTab = ({internalProjects,isLoading,	externalID}: ProjectSubmissionsTabProps) => {
	

	const exportProjects = useMemo<Record<string, unknown>[]>(
	() =>
		internalProjects.map((project) => ({
			id: project.id,
			name: project.name,
			external_id: project.external_id ?? '',
			principal_investigator: project.principal_investigator,
			requestor_name: project.requestor_name,
			status: project.status,
			created_at: project.created_at,
		})),
	[internalProjects],
	)

	const generateCsvContent = useCreateCsvExportFunction(exportProjects)

	if (!isLoading && internalProjects.length === 0) {
		return (
			<Empty
				description={`No project submissions found for ${externalID}`}
			/>
		)
	}


	const exportButtonData: ProjectOverviewExportButtonData = {
				exportType: 'Associated Projects',
				exportFunction: generateCsvContent,
				filename: 'Associated Projects',
				itemsCount: internalProjects.length,
				disabled: internalProjects.length === 0,
			}

	return (
		<>
			{!isLoading && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<ProjectOverviewExportButton data={exportButtonData} />
				</div>
			)}
			 {!isLoading && <ExternalIDProjectsDashboard data={internalProjects} />} 

			<Table
				size="small"
				bordered
				rowKey="id"
				dataSource={internalProjects}
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
