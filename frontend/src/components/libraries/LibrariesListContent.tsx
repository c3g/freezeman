import React, { useCallback, useMemo, useState } from 'react'
import { useAppSelector } from "../../hooks"
import { Library } from '../../models/frontend_models'
import LibrariesTableActions from '../../modules/librariesTable/actions'
import { selectLibrariesByID, selectLibrariesTable, selectLibraryPrefillTemplates, selectLibraryTemplateActions } from "../../selectors"
import api from '../../utils/api'
import { PrefilledTemplatesDropdown } from '../../utils/prefillTemplates'
import { ActionDropdown } from '../../utils/templateActions'
import AppPageHeader from "../AppPageHeader"
import ExportButton from '../ExportButton'
import PageContent from '../PageContent'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { setColumnWidths, setDynamicSorters } from '../pagedItemsTable/tableColumnUtilities'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import useListExportCallback from '../pagedItemsTable/useListExportCallback'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { usePrefilledTemplateCallback } from '../pagedItemsTable/usePrefilledTemplateCallback'
import SampleCategoryChooser, { SampleCategory, getSampleCategoryFilterSetting } from '../samples/SampleCategoryChooser'
import FlexBar from '../shared/Flexbar'
import { LIBARY_TABLE_FILTER_KEYS, LIBRARY_COLUMN_DEFINITIONS, LIBRARY_COLUMN_FILTERS, LibraryColumnID, ObjectWithLibrary } from "./LibraryTableColumns"

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
	const { filters, fixedFilters, sortByList, totalCount, isFetching } = librariesTableState
	const templateActions = useAppSelector(selectLibraryTemplateActions)
	const prefills = useAppSelector(selectLibraryPrefillTemplates)

	let initialCategory = SampleCategory.ALL
	const isPooledFilter = fixedFilters['is_pooled']
	if (isPooledFilter) {
		if (isPooledFilter.value === 'true') {
			initialCategory = SampleCategory.POOLS
		} else if (isPooledFilter.value === 'false') {
			initialCategory = SampleCategory.SAMPLES
		}
	}
	const [sampleCategory, setSampleCategory] = useState<SampleCategory>(initialCategory)

	const prefillTemplate = usePrefilledTemplateCallback(api.libraries.prefill.request, {...filters, ...fixedFilters}, sortByList)

	const listExport = useListExportCallback(api.libraries.listExport, {...filters, ...fixedFilters}, sortByList)

	const librariesTableCallbacks = usePagedItemsActionsCallbacks(LibrariesTableActions)

	const clearFiltersAndCategory = useCallback(async () => {
		librariesTableCallbacks.setFixedFilterCallback(getSampleCategoryFilterSetting(SampleCategory.ALL))
		await librariesTableCallbacks.clearFiltersCallback()
	}, [librariesTableCallbacks])


	// Tweak the column definitions a bit for this table.
	const tweakedColumns = useMemo(() => {
		const MEDIUM_COLUMN_WIDTH = 170
		const LARGE_COLUMN_WIDTH = 270

		// Set the widths of selected columns in this table.
		let columns = setColumnWidths(LIBRARY_TABLE_COLUMNS, {
			[LibraryColumnID.ID]: 100,
			[LibraryColumnID.PLATFORM_NAME]: 200,
			[LibraryColumnID.PROJECT_NAME]: LARGE_COLUMN_WIDTH,
			[LibraryColumnID.NAME]: LARGE_COLUMN_WIDTH,
			[LibraryColumnID.CONTAINER_BARCODE]: LARGE_COLUMN_WIDTH,
			[LibraryColumnID.COORDINATES]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.LIBRARY_TYPE]: 170,
			[LibraryColumnID.SELECTION_TARGET]: 200,
			[LibraryColumnID.INDEX_NAME]: LARGE_COLUMN_WIDTH*1.5,
			[LibraryColumnID.VOLUME]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.LIBRARY_SIZE]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.CONCENTRATION_NM]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.CONCENTRATION]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.NA_QUANTITY]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.QC_FLAG]: MEDIUM_COLUMN_WIDTH,
			[LibraryColumnID.CREATION_DATE]: 170,
			[LibraryColumnID.DEPLETED]: MEDIUM_COLUMN_WIDTH
		})


    columns = setDynamicSorters(columns, [
			LibraryColumnID.PLATFORM_NAME,
			LibraryColumnID.PROJECT_NAME,
			LibraryColumnID.LIBRARY_TYPE,
			LibraryColumnID.SELECTION_TARGET,
			LibraryColumnID.INDEX_NAME,
			LibraryColumnID.LIBRARY_SIZE,
		]
		, sampleCategory === SampleCategory.SAMPLES, true)

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
						sampleCategory={sampleCategory}
						onChange={onSampleCategoryChange}
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

