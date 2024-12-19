import React, { useCallback, useMemo, useState } from 'react'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { Sample } from '../../models/frontend_models'
import { selectPageSize, selectSamplePrefillTemplates, selectSampleTemplateActions, selectSamplesByID } from '../../selectors'
import api from '../../utils/api'
import { PrefilledTemplatesDropdown } from '../../utils/prefillTemplates'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportDropdown from '../ExportDropdown'
import PageContent from '../PageContent'
import FilterPanel from '../filters/filterPanel/FilterPanel'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { setDynamicSorters } from '../pagedItemsTable/tableColumnUtilities'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import useListExportCallback from '../pagedItemsTable/useListExportCallback'
import { usePrefilledTemplateCallback } from '../pagedItemsTable/usePrefilledTemplateCallback'
import Flexbar from '../shared/Flexbar'
import SampleCategoryChooser, { SampleCategory, getSampleCategoryFilterSetting } from './SampleCategoryChooser'
import { SAMPLE_COHORT_FILTER, SAMPLE_COLLECTION_SITE_FILTER, SAMPLE_METADATA_FILTER, SAMPLE_PEDIGREE_FILTER, SAMPLE_QPCR_STATUS, SAMPLE_SEX_FILTER } from './SampleDetachedFilters'
import { ObjectWithSample, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumnID, SAMPLE_COLUMN_DEFINITIONS as SampleColumns } from './SampleTableColumns'
import { PagedItemsListFuncType, usePagedItems } from '../../models/paged_items_factory'
import { list as listSamples } from '../../modules/samples/actions'

const SAMPLES_TABLE_COLUMNS = [
	SampleColumns.ID,
	SampleColumns.KIND,
	SampleColumns.NAME,
	SampleColumns.PROJECT,
	SampleColumns.INDIVIDUAL,
	SampleColumns.CONTAINER_NAME,
	SampleColumns.CONTAINER_BARCODE,
	SampleColumns.COORDINATES,
	SampleColumns.VOLUME,
	SampleColumns.CONCENTRATION,
	SampleColumns.QC_FLAG,
	SampleColumns.CREATION_DATE,
	SampleColumns.DEPLETED
]

const detachedFilters = [
	SAMPLE_PEDIGREE_FILTER,
	SAMPLE_COHORT_FILTER,
	SAMPLE_SEX_FILTER,
	SAMPLE_COLLECTION_SITE_FILTER,
	SAMPLE_QPCR_STATUS,
	SAMPLE_METADATA_FILTER
]

function wrapSample(sample: Sample) {
	return { sample }
}

function SamplesListContent() {
	const dispatch = useAppDispatch()
	const pageSize = useAppSelector(selectPageSize)
	const samplesByID = useAppSelector(selectSamplesByID)
	const list: PagedItemsListFuncType<Sample> = useCallback(async (options) => {
		const data = await dispatch(listSamples(options))
		return {
			results: data.results.map((s) => samplesByID[s.id]),
			count: data.count
		}
	}, [dispatch, samplesByID])
	const [samplesTableState, samplesTableActions] = usePagedItems(list, () => pageSize) 
	const { filters, fixedFilters, sortBy, totalCount, isFetching } = samplesTableState
	const templateActions = useAppSelector(selectSampleTemplateActions)
	const prefills = useAppSelector(selectSamplePrefillTemplates)
	const [sampleCategory, setSampleCategory] = useState<SampleCategory>()

	const prefillTemplate = usePrefilledTemplateCallback(api.samples.prefill.request, {...filters, ...fixedFilters}, sortBy)

	const listExport = useListExportCallback(api.samples.listExport, {...filters, ...fixedFilters}, sortBy)

	const listExportMetadata = useListExportCallback(api.samples.listExportMetadata,  {...filters, ...fixedFilters}, sortBy)


	// Special clearFilters callback that also sets the sample category back to ALL whenever
	// filters are cleared. Do we still want that to happen?
	const clearFiltersAndCategory = useCallback(() => {
		samplesTableActions.setFixedFilter(getSampleCategoryFilterSetting(SampleCategory.ALL))
		return samplesTableActions.clearFilters()
	}, [samplesTableActions])
	const samplesTableActionsTweaked = useMemo(() => {
		return {
			...samplesTableActions,
			clearFilters: clearFiltersAndCategory
		}
	}, [samplesTableActions, clearFiltersAndCategory])

	// Tweak the columns to customize them for this table.
	const tweakedColumns = useMemo(() => {
		let columns = SAMPLES_TABLE_COLUMNS

		// Only allow sorting on these columns when the table is displaying only samples (and not pools).
		columns = setDynamicSorters(columns, [
			SampleColumnID.KIND,
			SampleColumnID.INDIVIDUAL,
			SampleColumnID.PROJECT,
		], sampleCategory === SampleCategory.SAMPLES)

		return columns
	}, [sampleCategory])


	const baseColumns = useFilteredColumns(
		tweakedColumns,
		SAMPLE_COLUMN_FILTERS,
		SAMPLE_FILTER_KEYS,
		filters,
		samplesTableActions.setFilter,
		samplesTableActions.setFilterOptions
	)

	// When the user switches between Samples/Pools/All we have to refresh the page.
	const onSampleCategoryChange = useCallback(
		(sampleCategory: SampleCategory) => {
			setSampleCategory(sampleCategory)
			samplesTableActions.refreshPage()
		}
	, [samplesTableActions])

	const mapSampleIDs = useItemsByIDToDataObjects(selectSamplesByID, wrapSample)

	return (
		<>
			<AppPageHeader
				title = "Samples"
				extra={[
					<AddButton key="add" url="/samples/add" />,
					<ActionDropdown key="actions" urlBase={'/samples'} actions={templateActions} />,
					<PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalCount} prefills={prefills}/>,
					<ExportDropdown key='export' listExport={listExport} listExportMetadata={listExportMetadata} itemsCount={totalCount}/>,
				]}
			/>
			<PageContent>
				<FilterPanel descriptions={detachedFilters} filters={samplesTableState.filters} setFilter={samplesTableActions.setFilter} setFilterOption={samplesTableActions.setFilterOptions}/>
				<Flexbar style={{alignItems: 'center'}}>
					<SampleCategoryChooser
						disabled={isFetching}
						filters={fixedFilters}
						setFixedFilter={samplesTableActions.setFixedFilter}
						onChange={(category) => onSampleCategoryChange(category)}
					/>
					<FiltersBar filters={samplesTableState.filters} clearFilters={clearFiltersAndCategory}/>
				</Flexbar>
				<PagedItemsTable<ObjectWithSample>
					getDataObjectsByID={mapSampleIDs}
					pagedItems={samplesTableState}
					pagedItemsActions={samplesTableActionsTweaked}
					columns={baseColumns}
					usingFilters={false}
					initialLoad={false}
				/>
			</PageContent>
		</>
	)
}

export default SamplesListContent