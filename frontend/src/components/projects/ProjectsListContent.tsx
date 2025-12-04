import React, { useCallback, useState } from 'react'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectProjectTemplateActions } from '../../selectors'
import api from '../../utils/api'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'
import ProjectTable from './ProjectTable'
import { ProjectColumnID } from './ProjectsTableColumns'
import ListExportContext from './ListExportContext'
import { FilterDescriptions } from '../../utils/tableHooks'
import { FILTER_TYPE, PROJECT_STATUS } from '../../constants'

const ProjectsListContent = () => {
	const dispatch = useAppDispatch()

	const [filterDescriptions, setFilterDescriptions] = useState<FilterDescriptions<ProjectColumnID>>({
		[ProjectColumnID.ID]: { type: FILTER_TYPE.INPUT_OBJECT_ID },
		[ProjectColumnID.NAME]: { type: FILTER_TYPE.INPUT, exactMatch: false, startsWith: false },
		[ProjectColumnID.EXTERNAL_ID]: { type: FILTER_TYPE.INPUT_OBJECT_ID },
		[ProjectColumnID.PRINCIPAL_INVESTIGATOR]: { type: FILTER_TYPE.INPUT, exactMatch: false, startsWith: false },
		[ProjectColumnID.REQUESTOR_NAME]: { type: FILTER_TYPE.INPUT, exactMatch: false, startsWith: false },
		[ProjectColumnID.REQUESTOR_EMAIL]: { type: FILTER_TYPE.INPUT, exactMatch: false, startsWith: false },
		[ProjectColumnID.TARGETED_END_DATE]: { type: FILTER_TYPE.DATE_RANGE },
		[ProjectColumnID.STATUS]: { type: FILTER_TYPE.SELECT, options: PROJECT_STATUS.map(x => ({ label: x, value: x })), },
	})

	const templateActions = useAppSelector(selectProjectTemplateActions)

	const contextValue = React.useState<{ itemsCount: number, options: any }>({ itemsCount: 0, options: {} })
	const [{ options, itemsCount }] = contextValue
	const listExport = useCallback(() => {
		return dispatch(api.projects.listExport(options)).then(response => response.data)
	}, [dispatch, options])

	return (
		<>
			<AppPageHeader
				title="Projects"
				extra={[
					<AddButton key="add" url="/projects/add" />,
					<ActionDropdown key="actions" urlBase={'/projects'} actions={templateActions} />,
					<ExportButton key="export" exportType={undefined} exportFunction={listExport} filename="projects" itemsCount={itemsCount} />,
				]}
			/>
			<PageContent>
				<ListExportContext.Provider value={contextValue}>
					<ProjectTable
						defaultPageSize={25}
						columnIDs={columnIDs}
						requestIDSuffix={".ProjectsListContent"}
						filterDescriptions={filterDescriptions} setFilterDescriptions={setFilterDescriptions}
					/>
				</ListExportContext.Provider>
			</PageContent>
		</>
	)
}

export default ProjectsListContent

const columnIDs = [
	ProjectColumnID.ID,
	ProjectColumnID.NAME,
  	ProjectColumnID.EXTERNAL_ID,
	ProjectColumnID.PRINCIPAL_INVESTIGATOR,
	ProjectColumnID.REQUESTOR_NAME,
	ProjectColumnID.REQUESTOR_EMAIL,
	ProjectColumnID.TARGETED_END_DATE,
	ProjectColumnID.STATUS
]
