import { Alert, Button, Input, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { FMSProject } from '../../models/fms_api_models'
import api from '../../utils/api'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { ProjectsByExternalIDGroup } from './types'
import { useAppDispatch } from '../../hooks'
import { SearchOutlined } from '@ant-design/icons'

import FiltersBar from '../filters/filtersBar/FiltersBar'
import { FilterSet } from '../../models/paged_items'

const HERCULES_PROJECT_NAME_FILTER_KEY = 'hercules_project_name'

const projectColumns: ColumnsType<FMSProject> = [
	{
		title: 'ID',
		dataIndex: 'id',
		key: 'id',
		render: (id: number) => <Link to={`/projects/${id}#overview`}>{id}</Link>,
	},
	{
		title: 'Project Name',
		dataIndex: 'name',
		key: 'name',
		render: (name: string, project: FMSProject) => <Link to={`/projects/${project.id}#overview`}>{name}</Link>,
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

const ProjectsByExternalIDPage = () => {
	const [groups, setGroups] = useState<ProjectsByExternalIDGroup[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [filters, setFilters] = useState<FilterSet>({})

	const clearFilters = useCallback(() => {
		setFilters({})
	}, [])

	const groupColumns: ColumnsType<ProjectsByExternalIDGroup> = [
		{
			title: 'External Project ID',
			dataIndex: 'external_id',
			key: 'external_id',
			width: 120,
			render: (externalID: string | null) =>
				externalID ? (
					<Link to={`/project-overview/external-id/${encodeURIComponent(externalID)}#submissions`}>{externalID}</Link>
				) : (
					<span>No External ID</span>
				),
		},
		{
			title: 'Hercules Project Name',
			dataIndex: 'hercules_project_name',
			key: 'hercules_project_name',
			filteredValue: filters[HERCULES_PROJECT_NAME_FILTER_KEY]?.value
				? [String(filters[HERCULES_PROJECT_NAME_FILTER_KEY].value)]
				: null,
			filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
			filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
				<div style={{ padding: 8 }}>
					<Input
						placeholder="Search Hercules project name"
						value={selectedKeys[0]}
						onChange={(event) => setSelectedKeys(event.target.value ? [event.target.value] : [])}
						onPressEnter={() => confirm()}
						style={{ marginBottom: 8, display: 'block', width: 260 }}
					/>
					<Button
						type="primary"
						size="small"
						onClick={() => {
							const value = String(selectedKeys[0] || '')

							setFilters(
								value
									? {
											[HERCULES_PROJECT_NAME_FILTER_KEY]: {
												value,
												description: {
													type: 'INPUT',
													key: HERCULES_PROJECT_NAME_FILTER_KEY,
													label: 'Hercules Project Name',
												},
											},
										}
									: {},
							)

							confirm()
						}}
						style={{ width: 90, marginRight: 8 }}
					>
						Search
					</Button>
					<Button
						size="small"
						onClick={() => {
							clearFilters?.()
							setFilters({})
							confirm()
						}}
						style={{ width: 90 }}
					>
						Reset
					</Button>
				</div>
			),
			onFilter: (value, record) => (record.hercules_project_name || '').toLowerCase().includes(String(value).toLowerCase()),
			render: (herculesProjectName: string | null) => herculesProjectName || '',
		},
		{
			title: 'Freezeman Projects',
			dataIndex: 'project_count',
			key: 'project_count',
			width: 20,
			render: (projectCount: number) => <Tag color={projectCount > 1 ? 'blue' : 'default'}>{projectCount}</Tag>,
		},
	]

	const dispatch = useAppDispatch()

	const fetchProjectsByExternalID = useCallback(async () => {
		try {
			setIsLoading(true)
			setError(null)

			const response = await dispatch(api.projectOverview.projectsByExternalID(undefined, true))
			setGroups(response.data)
		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError') {
				setGroups([])
				setError('Unable to fetch projects by External ID')
			}
		} finally {
			setIsLoading(false)
		}
	}, [dispatch])

	useEffect(() => {
		fetchProjectsByExternalID()
	}, [fetchProjectsByExternalID])

	return (
		<>
			<AppPageHeader title="Projects by External ID" />

			<PageContent>
				{error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<FiltersBar filters={filters} clearFilters={clearFilters} />
				</div>
				<Table
					size="small"
					bordered
					rowKey={(group) => group.external_id || 'no-external-id'}
					dataSource={groups}
					columns={groupColumns}
					loading={isLoading}
					expandable={{
						expandedRowRender: (group) => (
							<Table size="small" rowKey="id" dataSource={group.projects} columns={projectColumns} pagination={false} />
						),
					}}
					pagination={{
						pageSize: 20,
						showSizeChanger: true,
						pageSizeOptions: ['20', '50', '100'],
						showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} external IDs`,
					}}
				/>
			</PageContent>
		</>
	)
}

export default ProjectsByExternalIDPage
