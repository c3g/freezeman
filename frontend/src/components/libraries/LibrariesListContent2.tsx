import React, { useCallback } from 'react'
import { useAppSelector } from "../../hooks"
import { Library } from '../../models/frontend_models'
import LibrariesTableActions from '../../modules/librariesTable/actions'
import { selectLibrariesByID, selectLibrariesTable, selectLibraryPrefillTemplates, selectLibraryTemplateActions, selectToken } from "../../selectors"
import api, { withToken } from '../../utils/api'
import { PrefilledTemplatesDropdown } from '../../utils/prefillTemplates'
import { ActionDropdown } from '../../utils/templateActions'
import AppPageHeader from "../AppPageHeader"
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import PagedItemsTable, { useFilteredColumns, useItemsByIDToDataObjects, usePagedItemsActionsCallbacks } from '../pagedItemsTable/PagedItemsTable'
import SampleCategoryChooser, { SampleCategory, getSampleCategoryFilterSetting } from '../samples/SampleCategoryChooser'
import FlexBar from '../shared/Flexbar'
import { LIBARY_TABLE_FILTER_KEYS, LIBRARY_COLUMN_DEFINITIONS, LIBRARY_COLUMN_FILTERS, ObjectWithLibrary } from "../shared/WorkflowSamplesTable/LibraryTableColumns"
import { filtersQueryParams } from '../shared/WorkflowSamplesTable/serializeFilterParamsTS'

const tableColumns = [
	LIBRARY_COLUMN_DEFINITIONS.ID,
	LIBRARY_COLUMN_DEFINITIONS.PLATFORM_NAME,
	LIBRARY_COLUMN_DEFINITIONS.PROJECT_NAME,
	LIBRARY_COLUMN_DEFINITIONS.NAME,
	LIBRARY_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
	LIBRARY_COLUMN_DEFINITIONS.COORDINATES,
	LIBRARY_COLUMN_DEFINITIONS.LIBRARY_TYPE,
	LIBRARY_COLUMN_DEFINITIONS.SELECTION_TARGET,
	LIBRARY_COLUMN_DEFINITIONS.INDEX_NAME,
	LIBRARY_COLUMN_DEFINITIONS.VOLUME,
	LIBRARY_COLUMN_DEFINITIONS.LIBRARY_SIZE,
	LIBRARY_COLUMN_DEFINITIONS.CONCENTRATION_NM,
	LIBRARY_COLUMN_DEFINITIONS.CONCENTRATION,
	LIBRARY_COLUMN_DEFINITIONS.NA_QUANTITY,
	LIBRARY_COLUMN_DEFINITIONS.QC_FLAG,
	LIBRARY_COLUMN_DEFINITIONS.CREATION_DATE,
	LIBRARY_COLUMN_DEFINITIONS.DEPLETED
]

function wrapLibrary(library: Library) {
	return { library }
}

export default function LibariesListContent() {
	const librariesTableState = useAppSelector(selectLibrariesTable)
	const { filters, fixedFilters, sortBy, totalCount, isFetching } = librariesTableState
	const templateActions = useAppSelector(selectLibraryTemplateActions)
	const prefills = useAppSelector(selectLibraryPrefillTemplates)
	const token = useAppSelector(selectToken)

	const prefillTemplate = useCallback(({template}) =>
		withToken(token, api.libraries.prefill.request)(filtersQueryParams({...filters, ...fixedFilters}, sortBy), template)
		.then(response => response)
	, [token, filters, fixedFilters, sortBy])

	const listExport = useCallback(() => {
		return withToken(token, api.libraries.listExport)(filtersQueryParams({...filters, ...fixedFilters}, sortBy))
			.then(response => response.data)
	}
	, [token, filters, fixedFilters, sortBy])

	const librariesTableCallbacks = usePagedItemsActionsCallbacks(LibrariesTableActions)

	const clearFiltersAndCategory = useCallback(() => {
		librariesTableCallbacks.setFixedFilterCallback(getSampleCategoryFilterSetting(SampleCategory.ALL))
		librariesTableCallbacks.clearFiltersCallback()
	}, [librariesTableCallbacks])

	const baseColumns = useFilteredColumns(
		tableColumns,
		LIBRARY_COLUMN_FILTERS,
		LIBARY_TABLE_FILTER_KEYS,
		filters,
		librariesTableCallbacks.setFilterCallback,
		librariesTableCallbacks.setFilterOptionsCallback
	)

	const mapLibaryIDs = useItemsByIDToDataObjects(selectLibrariesByID, wrapLibrary)

	return (
		<>
			<AppPageHeader
				title='Libraries'
				extra = {[
					<ActionDropdown key="actions" urlBase={'/libraries'} actions={templateActions} />,
					<PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalCount} prefills={prefills}/>,
					<ExportButton key='export' exportFunction={listExport} filename="libraries" itemsCount={totalCount} exportType={undefined}/>,
				]}
			/>
			<PageContent>
				<FlexBar style={{alignItems: 'center'}}>
					<SampleCategoryChooser
						disabled={isFetching}
						filters={fixedFilters}
						setFixedFilter={librariesTableCallbacks.setFixedFilterCallback}
						onChange={() => librariesTableCallbacks.refreshPageCallback()}
					/>
					<FiltersBar filters={filters} clearFilters={clearFiltersAndCategory}/>
				</FlexBar>

				<PagedItemsTable<ObjectWithLibrary> 
					getDataObjectsByID={mapLibaryIDs}
					pagedItems={librariesTableState}
					columns={baseColumns}
					usingFilters={false}
					{...librariesTableCallbacks}
					clearFiltersCallback={clearFiltersAndCategory}
				/>
			</PageContent>
		</>
	)
}

