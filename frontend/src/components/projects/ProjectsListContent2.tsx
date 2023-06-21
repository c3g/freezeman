import React, { useCallback } from 'react'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { selectProjectTemplateActions, selectProjectsByID, selectProjectsTable, selectToken } from '../../selectors'
import api, { withToken } from '../../utils/api'
import mergedListQueryParams from '../../utils/mergedListQueryParams'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'
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
	const dispatch = useAppDispatch()
	const projectsTableState  = useAppSelector(selectProjectsTable)
	const projectsByID = useAppSelector(selectProjectsByID)
	const { filters, sortBy, totalCount } = projectsTableState
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

	

	const mapProjectIDs = useCallback((ids: FMSId[]) => {
		async function mapIDsToProjects(ids: FMSId[]) {
			const data = ids.reduce((acc, id) => {
				const project = projectsByID[id]
				if (project) {
					acc.push({ id, project })
				}
				return acc
			}, [] as ObjectWithProject[])

			return data
		}
		return mapIDsToProjects(ids)
	}, [projectsByID])

	const projectsRequestCallback = useCallback((pageNumber: number) => {
		dispatch(ProjectsTableActions.listPage(pageNumber))
	}, [dispatch])
	
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
					requestPageCallback={projectsRequestCallback}
					getDataObjectsByID={mapProjectIDs}
					pagedItems={projectsTableState}
					pagedItemsActions={ProjectsTableActions}
					columns={columns}
					usingFilters={true}
				/>
			</PageContent>
		</>
	)
}

export default ProjectsListContent2
