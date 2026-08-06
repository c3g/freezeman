
import { Alert, Button, Input, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useEffect, useState } from 'react'
import AppPageHeader from '../AppPageHeader'
import { Link } from 'react-router-dom'
import { FMSProject } from '../../models/fms_api_models'
import api from '../../utils/api'

import PageContent from '../PageContent'

import { useAppDispatch } from '../../hooks'
import { SearchOutlined } from '@ant-design/icons'

import FiltersBar from '../filters/filtersBar/FiltersBar'
import { FilterSet } from '../../models/paged_items'
import {FMSParentProject} from '../../models/fms_api_models'


const EXTERNAL_PROJECT_NAME_FILTER_KEY = 'external_project_name'

const internalProjectColumns: ColumnsType<FMSProject> = [
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
		render: (createdAt: string) =>  createdAt  ? 
			new Date(createdAt).toLocaleDateString('en-US', 
				{
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				})
				: '',
	},
]


const ExternalProjectsPage = () => {
	const [parentProjects, setParentProjects] = useState<FMSParentProject[]>([])
	const [internalProjectsByID, setInternalProjectsByID] = useState<Partial<Record<number, FMSProject>>>({})

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [filters, setFilters] = useState<FilterSet>({})

	const clearFilters = useCallback(() => {setFilters({})}, [])

	const parentProjectColumns: ColumnsType<FMSParentProject> = [
		{
			title: 'External Project ID',
			dataIndex: 'external_id',
			key: 'external_id',
			width: 120,
			render: (externalID: string, parentProject: FMSParentProject) => (<Link to={`/external-projects-overview/${parentProject.id}#submissions`}>{externalID}</Link>)
		},
		{
			title: 'External Project Name',
			dataIndex: 'name',
			key: 'external_project_name',
			filteredValue: filters[EXTERNAL_PROJECT_NAME_FILTER_KEY]?.value ? [String(filters[EXTERNAL_PROJECT_NAME_FILTER_KEY].value)] : null,
			filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
			filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
				<div style={{ padding: 8 }}>
					<Input
						placeholder="Search External project name"
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
							setFilters( value ? {
											[EXTERNAL_PROJECT_NAME_FILTER_KEY]: {
												value,
												description: {
													type: 'INPUT',
													key: EXTERNAL_PROJECT_NAME_FILTER_KEY,
													label: 'External Project Name',
												},
											}  ,
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
			onFilter: (value, record) => (record.name || '').toLowerCase().includes(String(value).toLowerCase()),
			render: (externalProjectName: string | null) => externalProjectName || '',
		},
		{
			title: 'Freezeman Projects',
			dataIndex: 'projects',
			key: 'projects',
			width: 20,
			render: (projects: FMSParentProject['projects']) => {
				const projectCount = projects?.length ?? 0
				return (
					<Tag color={projectCount > 1 ? 'blue' : 'default'}>
						{projectCount}
					</Tag>
				)
			},
		},
	]

	const dispatch = useAppDispatch()

	const fetchProjectsByExternalID = useCallback(async () => {
		try {
			setIsLoading(true)
			setError(null)

			const response = await dispatch(
				api.parentProjects.list({limit: 100000,ordering: 'external_id',},true,),
			)
			
			const fetchedParentProjects = response.data.results
			setParentProjects(fetchedParentProjects)

			const internalProjectIDs = [
                ...new Set(fetchedParentProjects.flatMap((parentProject) => parentProject.projects ?? [])),
			]
			

			if (internalProjectIDs.length > 0) {
    			const internalProjectsResponse = await dispatch(
        		api.projects.list(
            		{
                		id__in: internalProjectIDs.join(','),
                		limit: 100000,
            		},
            	true,
        			),
    			)

    		const fetchedInternalProjects = internalProjectsResponse.data.results
			
			const fetchedInternalProjectsByID = fetchedInternalProjects.reduce<Partial<Record<number, FMSProject>>>(
				(projectsByID, project) => {
					projectsByID[project.id] = project
					return projectsByID
				}, {})

			setInternalProjectsByID(fetchedInternalProjectsByID)
			} 
			else 
			{
    		    setInternalProjectsByID({})
			}
		} 
		catch (error) {

			if (error instanceof Error && error.name !== 'AbortError') {
				setParentProjects([])
				setInternalProjectsByID({})
				setError('Unable to fetch projects by External ID')
			}
		} 
		finally {
			setIsLoading(false)
		}
	}, [dispatch])

	useEffect(() => {
		fetchProjectsByExternalID()
	}, [fetchProjectsByExternalID])

	

	return (
		<>
			<AppPageHeader title="Projects by External ID" />

			{ <PageContent>
				{error && (<Alert type="error" title={error} style={{ marginBottom: 16 }} />)}
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<FiltersBar filters={filters} clearFilters={clearFilters} />
				</div>
				<Table
					size="small"
					bordered
					rowKey={(parentProject) => parentProject.external_id || 'no-external-id'}
					dataSource={parentProjects}
					columns={parentProjectColumns}
					loading={isLoading}
					
					expandable={{
    					expandedRowRender: (parentProject) => {const internalProjects = (parentProject.projects ?? [])
            				.map((projectID) => internalProjectsByID[projectID])
							.filter((project): project is FMSProject =>project !== undefined)
							return (
								<Table
									size="small"
									rowKey="id"
									dataSource={internalProjects}
									columns={internalProjectColumns}
									pagination={false}
								/>
							)
                           },
                    }}
					pagination={{
						pageSize: 20,
						showSizeChanger: true,
						pageSizeOptions: ['20', '50', '100'],
						showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} external IDs`,
					}}
				/>
			</PageContent> }
		</>
	)
}

export default ExternalProjectsPage

