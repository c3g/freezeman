import React, { useCallback } from 'react'

import { useAppSelector } from '../../hooks'
import { Sample } from '../../models/frontend_models'
import SamplesTableActions from '../../modules/samplesTable/actions'
import { selectSamplePrefillTemplates, selectSampleTemplateActions, selectSamplesByID, selectSamplesTable, selectToken } from '../../selectors'
import api, { withToken } from '../../utils/api'
import { PrefilledTemplatesDropdown } from '../../utils/prefillTemplates'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportDropdown from '../ExportDropdown'
import PageContent from '../PageContent'
import FilterPanel from '../filters/filterPanel/FilterPanel'
import FiltersBar from '../filters/filtersBar/FiltersBar'
import PagedItemsTable, { useFilteredColumns, useItemsByIDToDataObjects, usePagedItemsActionsCallbacks } from '../pagedItemsTable/PagedItemsTable'
import Flexbar from '../shared/Flexbar'
import { filtersQueryParams } from '../shared/WorkflowSamplesTable/serializeFilterParamsTS'
import SampleCategoryChooser, { SampleCategory, getSampleCategoryFilterSetting } from './SampleCategoryChooser'
import { SAMPLE_COHORT_FILTER, SAMPLE_COLLECTION_SITE_FILTER, SAMPLE_METADATA_FILTER, SAMPLE_PEDIGREE_FILTER, SAMPLE_QPCR_STATUS, SAMPLE_SEX_FILTER } from './SampleDetachedFilters'
import { ObjectWithSample, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS as SampleColumns } from './SampleTableColumns'

const samplesTableColumns = [
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
	const samplesTableState = useAppSelector(selectSamplesTable)
	const { filters, fixedFilters, sortBy, totalCount, isFetching } = samplesTableState
	const templateActions = useAppSelector(selectSampleTemplateActions)
	const prefills = useAppSelector(selectSamplePrefillTemplates)
	const token = useAppSelector(selectToken)

	const prefillTemplate = useCallback(({template}) =>
		withToken(token, api.samples.prefill.request)(filtersQueryParams({...filters, ...fixedFilters}, sortBy), template)
		.then(response => response)
	, [token, filters, fixedFilters, sortBy])

	const listExport = useCallback(() => {
		return withToken(token, api.samples.listExport)
			(filtersQueryParams({...filters, ...fixedFilters}, sortBy))
			.then(response => response.data)
	}
	, [token, filters, fixedFilters, sortBy])

	const listExportMetadata = useCallback(() =>
		withToken(token, api.samples.listExportMetadata)(filtersQueryParams({...filters, ...fixedFilters}, sortBy))
		.then(response => response.data)
	, [token, filters, fixedFilters, sortBy])

	const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)

	// Special clearFilters callback that also sets the sample category back to ALL whenever
	// filters are cleared. Do we still want that to happen?
	const clearFiltersAndCategory = useCallback(() => {
		samplesTableCallbacks.setFixedFilterCallback(getSampleCategoryFilterSetting(SampleCategory.ALL))
		samplesTableCallbacks.clearFiltersCallback()
	}, [samplesTableCallbacks])

	const baseColumns = useFilteredColumns(
		samplesTableColumns,
		SAMPLE_COLUMN_FILTERS,
		SAMPLE_FILTER_KEYS,
		filters,
		samplesTableCallbacks.setFilterCallback,
		samplesTableCallbacks.setFilterOptionsCallback
	)

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
				<FilterPanel descriptions={detachedFilters} filters={samplesTableState.filters} setFilter={samplesTableCallbacks.setFilterCallback} setFilterOption={samplesTableCallbacks.setFilterOptionsCallback}/>
				<Flexbar style={{alignItems: 'center'}}>
					<SampleCategoryChooser
						disabled={isFetching}
						filters={fixedFilters}
						setFixedFilter={samplesTableCallbacks.setFixedFilterCallback}
						onChange={() => samplesTableCallbacks.refreshPageCallback()}
					/>
					<FiltersBar filters={samplesTableState.filters} clearFilters={clearFiltersAndCategory}/>
				</Flexbar>
				
				<PagedItemsTable<ObjectWithSample> 
					getDataObjectsByID={mapSampleIDs}
					pagedItems={samplesTableState}
					columns={baseColumns}
					usingFilters={false}
					{...samplesTableCallbacks}
					clearFiltersCallback={clearFiltersAndCategory}
				/>
			</PageContent>
		</>
	)
}

export default SamplesListContent