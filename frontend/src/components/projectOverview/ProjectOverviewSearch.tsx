
import { Input, Typography } from 'antd'
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import api from '../../utils/api'
import ExportButton from '../ExportButton'
import useListExportCallback from '../pagedItemsTable/useListExportCallback'


import { useAppSelector } from '../../hooks'
import { Project } from '../../models/frontend_models'
import ProjectsTableActions from '../../modules/projectsTable/actions'
import { selectProjectsByID, selectProjectsTable } from '../../selectors'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import FlexBar from '../shared/Flexbar'
import {
	ObjectWithProject,
	PROJECT_COLUMN_DEFINITIONS,
	PROJECT_FILTERS,
	PROJECT_FILTER_KEYS,
	ProjectColumnID,
} from '../projects/ProjectsTableColumns'

function wrapProject(project: Project) {
	return { project }
}

const PROJECT_OVERVIEW_NAME_COLUMN: IdentifiedTableColumnType<ObjectWithProject> = {
	...PROJECT_COLUMN_DEFINITIONS.NAME,
	title: 'Project Submissions Names',
	render: (name, { project }) => (
		<Link to={`/project-overview/${project.id}`}>
			<div>{name}</div>
		</Link>
	),
}

const ProjectOverviewSearch = () => {
	const projectsTableState = useAppSelector(selectProjectsTable)
	const { filters,sortByList,totalCount } = projectsTableState

	const projectsTableCallbacks = usePagedItemsActionsCallbacks(ProjectsTableActions)
    const listExport = useListExportCallback(api.projects.listExport, filters, sortByList)

	const [externalID, setExternalID] = useState('')
	const [hasSearched, setHasSearched] = useState(false)

	const CREATED_AT_COLUMN: IdentifiedTableColumnType<ObjectWithProject> = {
		columnID: 'CREATED_AT',
		title: 'Created At',
		dataIndex: ['project', 'created_at'],
		width: 40,
		sorter: { multiple: 1 },
		render: (createdAt?: string) =>
			createdAt
				? new Date(createdAt).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					})
				: '',
	}

	const PROJECT_OVERVIEW_ID_COLUMN: IdentifiedTableColumnType<ObjectWithProject> = {
		...PROJECT_COLUMN_DEFINITIONS.ID,
		render: (id, { project }) => (
			<Link to={`/project-overview/${project.id}`}>
				<div>{id}</div>
			</Link>
		),
	}

	const externalIDFilter = useMemo(
		() => ({
			...PROJECT_FILTERS[ProjectColumnID.EXTERNAL_ID],
			key: PROJECT_FILTER_KEYS[ProjectColumnID.EXTERNAL_ID],
		}),
		[],
	)

	const projectOverviewColumns = useMemo(
		() => [
			PROJECT_OVERVIEW_ID_COLUMN,
			PROJECT_OVERVIEW_NAME_COLUMN,
			PROJECT_COLUMN_DEFINITIONS.EXTERNAL_ID,
			PROJECT_COLUMN_DEFINITIONS.PRINCIPAL_INVESTIGATOR,
			PROJECT_COLUMN_DEFINITIONS.REQUESTOR_NAME,
			PROJECT_COLUMN_DEFINITIONS.STATUS,
			CREATED_AT_COLUMN,
		],
		[],
	)

	const columns = projectOverviewColumns

	const mapProjectIDs = useItemsByIDToDataObjects(selectProjectsByID, wrapProject)

	const handleSearch = async (value: string) => {
		const trimmedValue = value.trim()
		setExternalID(trimmedValue)

		await projectsTableCallbacks.resetPagedItemsCallback()

		if (!trimmedValue) {
			setHasSearched(false)
			return
		}

		setHasSearched(true)
		await projectsTableCallbacks.setFilterCallback(trimmedValue, externalIDFilter)
	}

	return (
		<>
			<AppPageHeader
	title="My Projects"
	extra={hasSearched ? [
		<ExportButton
			key="export"
			exportType={undefined}
			exportFunction={listExport}
			filename="project-overview-projects"
			itemsCount={totalCount}
		/>,
	] : []}
/>

			<PageContent>
				<FlexBar style={{ alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 16 }}>
					<Typography.Text strong>Project External ID</Typography.Text>
					<Input.Search
						allowClear
						enterButton="Search"
						placeholder="Enter a project external ID"
						value={externalID}
						onChange={(event) => setExternalID(event.target.value)}
						onSearch={handleSearch}
						style={{ maxWidth: 420 }}
					/>
				</FlexBar>

				{hasSearched && (
					<PagedItemsTable<ObjectWithProject>
						getDataObjectsByID={mapProjectIDs}
						pagedItems={projectsTableState}
						columns={columns}
						usingFilters={false}
						initialLoad={false}
						{...projectsTableCallbacks}
					/>
				)}
			</PageContent>
		</>
	)
}

export default ProjectOverviewSearch
