import React, { useCallback, useMemo, useState } from 'react'
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
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import SampleCategoryChooser, { SampleCategory, getSampleCategoryFilterSetting } from '../samples/SampleCategoryChooser'
import FlexBar from '../shared/Flexbar'
import { LIBARY_TABLE_FILTER_KEYS, LIBRARY_COLUMN_DEFINITIONS, LIBRARY_COLUMN_FILTERS, LibraryColumnID, ObjectWithLibrary } from "./LibraryTableColumns"
import { filtersQueryParams } from '../pagedItemsTable/serializeFilterParamsTS'
import { setColumnWidths, setDynamicSorters } from '../pagedItemsTable/tableColumnUtilities'

const LIBRARY_TABLE_COLUMNS = [
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
	const [sampleCategory, setSampleCategory] = useState<SampleCategory>()

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


	// Tweak the column definitions a bit for this table.
	const tweakedColumns = useMemo(() => {

		// Set the widths of selected columns in this table.
		let columns = setColumnWidths(LIBRARY_TABLE_COLUMNS, {
			[LibraryColumnID.ID] : 90,
			[LibraryColumnID.COORDINATES]: 70,
			[LibraryColumnID.VOLUME] : 100,
			[LibraryColumnID.LIBRARY_SIZE]: 80,
			[LibraryColumnID.CONCENTRATION_NM]: 115,
			[LibraryColumnID.CONCENTRATION]: 115,
			[LibraryColumnID.NA_QUANTITY]: 115,
			[LibraryColumnID.CREATION_DATE]: 115,
			[LibraryColumnID.DEPLETED]: 85,
		})

		// Set the sorter properties on the columns, depending on the sample category.
		// Sorting is disabled for some columns when pools are listed because the backend
		// doesn't handle pool sorting well.
		columns = setDynamicSorters(columns, [
			LibraryColumnID.PLATFORM_NAME,
			LibraryColumnID.PROJECT_NAME,
			LibraryColumnID.LIBRARY_TYPE,
			LibraryColumnID.SELECTION_TARGET,
			LibraryColumnID.INDEX_NAME,
			LibraryColumnID.LIBRARY_SIZE,
		]
		, sampleCategory === SampleCategory.SAMPLES)

		return columns

	}, [sampleCategory])

	// Now apply the filters to the columns.
	const baseColumns = useFilteredColumns(
		tweakedColumns,
		LIBRARY_COLUMN_FILTERS,
		LIBARY_TABLE_FILTER_KEYS,
		filters,
		librariesTableCallbacks.setFilterCallback,
		librariesTableCallbacks.setFilterOptionsCallback
	)

	// When the user switches between Samples/Pools/All we have to refresh the page.
	const onSampleCategoryChange = useCallback(
		(sampleCategory: SampleCategory) => {
			setSampleCategory(sampleCategory)
			librariesTableCallbacks.refreshPageCallback()
		}
	, [librariesTableCallbacks])

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
						onChange={(sampleCategory) => onSampleCategoryChange(sampleCategory)}
						samplesLabel='Libraries'
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

