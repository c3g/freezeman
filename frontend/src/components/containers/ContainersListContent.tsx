import React, { useCallback } from 'react'
import { useAppSelector } from '../../hooks'
import { Container } from '../../models/frontend_models'
import ContainersTableActions from '../../modules/containersTable/actions'
import { selectContainerPrefillTemplates, selectContainerTemplateActions, selectContainersByID, selectContainersTable, selectToken } from '../../selectors'
import api, { withToken } from '../../utils/api'
import { PrefilledTemplatesDropdown } from '../../utils/prefillTemplates'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'
import FilterPanel from '../filters/filterPanel/FilterPanel'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { filtersQueryParams } from '../pagedItemsTable/serializeFilterParamsTS'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { CONTAINER_COLUMN_FILTERS, CONTAINER_FILTER_KEYS, CONTAINER_COLUMN_DEFINITIONS as ContainerColumns, CONTAINER_COLUMN_FILTERS as ContainerFilters, ObjectWithContainer } from './ContainersTableColumns'

const containersTableColumns = [
	ContainerColumns.ID,
	ContainerColumns.NAME,
	ContainerColumns.BARCODE,
	ContainerColumns.SAMPLES,
	ContainerColumns.KIND,
	ContainerColumns.LOCATION,
	ContainerColumns.CHILDREN,
	ContainerColumns.COORDINATE
]

const commentFilter = {
	...ContainerFilters.COMMENT,
	key: CONTAINER_FILTER_KEYS.COMMENT
}

// Convert a container instance to an ObjectWithContainer
function wrapContainer(container: Container): ObjectWithContainer {
	return {container}
}

export default function ContainersListContent() {
	const containersTableState = useAppSelector(selectContainersTable)
	const { filters, sortBy, totalCount } = containersTableState
	const templateActions = useAppSelector(selectContainerTemplateActions)
	const prefills = useAppSelector(selectContainerPrefillTemplates)
	const token = useAppSelector(selectToken)

	const prefillTemplate = useCallback(({template}) =>
		withToken(token, api.containers.prefill.request)(filtersQueryParams(filters, sortBy), template)
		.then(response => response)
	, [token, filters, sortBy])

	const listExport = useCallback(() => {
		return withToken(token, api.containers.listExport)(filtersQueryParams(filters, sortBy))
			.then(response => response.data)
	}
	, [token, filters, sortBy])

	const containersTableCallbacks = usePagedItemsActionsCallbacks(ContainersTableActions)

	const columns = useFilteredColumns(
		containersTableColumns,
		CONTAINER_COLUMN_FILTERS,
		CONTAINER_FILTER_KEYS,
		filters,
		containersTableCallbacks.setFilterCallback,
		containersTableCallbacks.setFilterOptionsCallback
	)

	const mapContainerIDs = useItemsByIDToDataObjects(selectContainersByID, wrapContainer)

	return (
		<>
			 <AppPageHeader title="Containers" extra={[
				<AddButton key='add' url="/containers/add" />,
				<ActionDropdown key='actions' urlBase={"/containers"} actions={templateActions}/>,
				<PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalCount} prefills={prefills}/>,
				<ExportButton key='export' exportFunction={listExport} filename="containers" itemsCount={totalCount} exportType={undefined}/>,
    		]}/>
			<PageContent>
				<FilterPanel 
					descriptions={[commentFilter]}
					filters={filters}
					setFilter={containersTableCallbacks.setFilterCallback}
					setFilterOption={containersTableCallbacks.setFilterOptionsCallback}
				/>
				<FiltersBar filters={filters} clearFilters={containersTableCallbacks.clearFiltersCallback}/>
				<PagedItemsTable<ObjectWithContainer>
					columns={columns}
					getDataObjectsByID={mapContainerIDs}
					pagedItems={containersTableState}
					usingFilters={false}
					{...containersTableCallbacks}
				/>
			</PageContent>
		</>
	)
}