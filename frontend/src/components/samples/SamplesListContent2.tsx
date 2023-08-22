import React, { useCallback, useMemo, useState } from 'react'

import { useAppSelector } from '../../hooks'
import { Sample } from '../../models/frontend_models'
import SamplesTableActions from '../../modules/samplesTable/actions'
import { selectSamplePrefillTemplates, selectSampleTemplateActions, selectSamplesByID, selectSamplesTable, selectToken } from '../../selectors'
import api, { withToken } from '../../utils/api'
import { PrefilledTemplatesDropdown } from '../../utils/prefillTemplates'
import { ActionDropdown } from '../../utils/templateActions'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import PagedItemsTable, { useFilteredColumns, useItemsByIDToDataObjects, usePagedItemsActionsCallbacks } from '../pagedItemsTable/PagedItemsTable'
import SampleCategoryChooser, { SampleCategory } from './SampleCategoryChooser'
import { ObjectWithSample, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS as SampleColumns } from './SampleTableColumns'
import { FilterSetting } from '../../models/paged_items'
import { FILTER_TYPE } from '../../constants'
import Flexbar from '../shared/Flexbar'
import FiltersBar from '../filters/FiltersBar'
import ExportDropdown from '../ExportDropdown'
import FilterPanel from '../filters/filterGroup/FilterPanel'
import { SAMPLE_COHORT_FILTER, SAMPLE_COLLECTION_SITE_FILTER, SAMPLE_METADATA_FILTER, SAMPLE_PEDIGREE_FILTER, SAMPLE_QPCR_STATUS, SAMPLE_SEX_FILTER } from './SampleDetachedFilters'
import { filtersQueryParams } from '../shared/WorkflowSamplesTable/serializeFilterParamsTS'

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
	const { filters, sortBy, totalCount, isFetching } = samplesTableState
	const templateActions = useAppSelector(selectSampleTemplateActions)
	const prefills = useAppSelector(selectSamplePrefillTemplates)
	const token = useAppSelector(selectToken)
	const [sampleCategory, setSampleCategory] = useState<SampleCategory>(SampleCategory.ALL)

	const prefillTemplate = useCallback(({template}) =>
		withToken(token, api.samples.prefill.request)(filtersQueryParams(filters, sortBy), template)
		.then(response => response)
	, [token, filters, sortBy])

	const listExport = useCallback(() => {
		return withToken(token, api.samples.listExport)
			(filtersQueryParams(filters, sortBy))
			.then(response => response.data)
	}
	, [token, filters, sortBy])

	const listExportMetadata = useCallback(() =>
		withToken(token, api.samples.listExportMetadata)(filtersQueryParams(filters, sortBy))
		.then(response => response.data)
	, [token, filters, sortBy])

	const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)

	// Special clearFilters callback that also sets the sample category back to ALL whenever
	// filters are cleared. Do we still want that to happen?
	const clearFiltersAndCategory = useCallback(() => {
		setSampleCategory(SampleCategory.ALL)
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

	const handleSampleCategoryChange = useCallback((category: SampleCategory) => {
		let value : string
		switch(category) {
			case SampleCategory.POOLS: {
				value = 'true'
				break
			}
			case SampleCategory.SAMPLES: {
				value= 'false'
				break
			}
			default:
				value = ''
		}
		const filterSetting: FilterSetting = {
			value,
			description: {
				key: 'is_pooled',
				label: 'Pooled Samples',
				type: FILTER_TYPE.SELECT
			}
		}
		samplesTableCallbacks.setFixedFilterCallback(filterSetting)
		samplesTableCallbacks.refreshPageCallback()
		setSampleCategory(category)
	}, [sampleCategory, samplesTableCallbacks])

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
						value={sampleCategory}
						onChange={category => handleSampleCategoryChange(category)}
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