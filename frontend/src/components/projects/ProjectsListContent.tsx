import React, { useCallback } from 'react'

import { useAppSelector } from '../../hooks'
import { Project } from '../../models/frontend_models'
import ProjectsTableActions from '../../modules/projectsTable/actions'
import { selectAuthTokenAccess, selectProjectTemplateActions, selectProjectsByID, selectProjectsTable } from '../../selectors'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { ObjectWithProject, PROJECT_COLUMN_DEFINITIONS, PROJECT_FILTERS, PROJECT_FILTER_KEYS } from './ProjectsTableColumns'
import useListExportCallback from '../pagedItemsTable/useListExportCallback'
import { sort } from 'rambda'


const projectsListContentColumns = [
	PROJECT_COLUMN_DEFINITIONS.ID,
	PROJECT_COLUMN_DEFINITIONS.NAME,
    PROJECT_COLUMN_DEFINITIONS.EXTERNAL_ID,
	PROJECT_COLUMN_DEFINITIONS.PRINCIPAL_INVESTIGATOR,
	PROJECT_COLUMN_DEFINITIONS.REQUESTOR_NAME,
	PROJECT_COLUMN_DEFINITIONS.REQUESTOR_EMAIL,
	PROJECT_COLUMN_DEFINITIONS.TARGETED_END_DATE,
	PROJECT_COLUMN_DEFINITIONS.STATUS
]

function wrapProject(project: Project) {
	return {project}
}

const ProjectsListContent = () => {
	const projectsTableState  = useAppSelector(selectProjectsTable)
	const { filters, sortBy, totalCount } = projectsTableState
	const templateActions = useAppSelector(selectProjectTemplateActions)

	const listExport = useListExportCallback(api.projects.listExport, filters, sortBy)

	const projectsTableCallbacks = usePagedItemsActionsCallbacks(ProjectsTableActions)

	const columns = useFilteredColumns(
		projectsListContentColumns,
		PROJECT_FILTERS,
		PROJECT_FILTER_KEYS,
		filters,
		projectsTableCallbacks.setFilterCallback,
		projectsTableCallbacks.setFilterOptionsCallback
	)

	const mapProjectIDs = useItemsByIDToDataObjects(selectProjectsByID, wrapProject)

	return (
		<>
			<AppPageHeader
				title="Projects"
				extra={[
					<AddButton key="add" url="/projects/add" />,
					<ActionDropdown key="actions" urlBase={'/projects'} actions={templateActions} />,
					<ExportButton key="export" exportType={undefined} exportFunction={listExport} filename="projects" itemsCount={totalCount} />,
				]}
			/>
			<PageContent>
				<PagedItemsTable<ObjectWithProject>
					getDataObjectsByID={mapProjectIDs}
					pagedItems={projectsTableState}
					columns={columns}
					usingFilters={true}
					{...projectsTableCallbacks}
				/>
			</PageContent>
		</>
	)
}

export default ProjectsListContent
