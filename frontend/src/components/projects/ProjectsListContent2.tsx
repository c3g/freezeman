import React, { useCallback } from 'react'

import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'

import api, { withToken } from '../../utils/api'

import { useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { Project } from '../../models/frontend_models'
import { PagedItemsByID } from '../../models/paged_items'
import { selectProjectTemplateActions, selectProjectsByID, selectProjectsState, selectToken } from '../../selectors'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { ActionDropdown } from '../../utils/templateActions'
import PagedItemsTable, { useFilteredColumns } from '../pagedItemsTable/PagedItemsTable'
import ProjectsTableActions from './ProjectsTableActions'
import { ObjectWithProject, PROJECT_COLUMN_DEFINITIONS, PROJECT_FILTERS, PROJECT_FILTER_KEYS } from './ProjectsTableColumns'


const projectsListContentColumns = [
	PROJECT_COLUMN_DEFINITIONS.ID,
	PROJECT_COLUMN_DEFINITIONS.NAME,
	PROJECT_COLUMN_DEFINITIONS.PRINCIPAL_INVESTIGATOR,
	PROJECT_COLUMN_DEFINITIONS.REQUESTOR_NAME,
	PROJECT_COLUMN_DEFINITIONS.REQUESTOR_EMAIL,
	PROJECT_COLUMN_DEFINITIONS.TARGETED_END_DATE,
	PROJECT_COLUMN_DEFINITIONS.STATUS
]

const ProjectsListContent2 = () => {

	const projectsState  = useAppSelector(selectProjectsState) as PagedItemsByID<Project>
	const projectsByID = useAppSelector(selectProjectsByID)
	const { filters, sortBy, totalCount } = projectsState
	const templateActions = useAppSelector(selectProjectTemplateActions)
	const token = useAppSelector(selectToken)

	const listExport = useCallback(() => {
		return withToken(token, api.projects.listExport)
			(mergedListQueryParams(PROJECT_FILTERS, filters, sortBy))
			.then(response => response.data)
	}
	, [token, filters, sortBy])

	const columns = useFilteredColumns(
						projectsListContentColumns, 
						PROJECT_FILTERS,
						PROJECT_FILTER_KEYS,
						filters,
						ProjectsTableActions.setFilter,
						ProjectsTableActions.setFilterOptions)

	async function mapProjectIDs(ids: FMSId[]) {
		const data = ids.reduce((acc, id) => {
			const project = projectsByID[id]
			if (project) {
				acc.push({id, project})
			}
			return acc
		}, [] as ObjectWithProject[])

		return data
	}
	
	return (
		<>
			<AppPageHeader
				title="Projects"
				extra={[
					<AddButton key="add" url="/projects/add" />,
					<ActionDropdown key="actions" urlBase={'/projects'} actions={templateActions} />,
					<ExportButton key="export" exportFunction={listExport} filename="projects" itemsCount={totalCount} />,
				]}
			/>
			<PageContent>
				<PagedItemsTable<ObjectWithProject>
					getItemsByID={mapProjectIDs}
					pagedItems={projectsState}
					pagedItemsActions={ProjectsTableActions}
					columns={columns}
					usingFilters={true}
				/>
			</PageContent>
		</>
	)
}

export default ProjectsListContent2
