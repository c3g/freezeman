import React, { useEffect, useState } from 'react'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable, { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { GROUPING_CREATION_DATE } from './LabworkStepOverview'
import { useAppDispatch } from '../../../hooks'
import { loadSamplesAtStep } from '../../../modules/labworkSteps/actions'
import { fetchSamplesAndLibraries } from '../../../modules/studySamples/services'

export interface LabworkStepPanelProps {
  refreshing: boolean
  grouping: FilterDescription
  groupingValue: string
	columns: IdentifiedTableColumnType<SampleAndLibrary>[]
	hasFilter: boolean,
	clearFilters?: (boolean?) => void,
	filterDefinitions?: FilterDescriptionSet,
	filterKeys?: FilterKeySet,
	filters?: FilterSet,
	setFilter?: SetFilterFunc,
	setFilterOptions?: SetFilterOptionFunc,
	sortBy?: SortBy,
	setSortBy?: SetSortByFunc,
	pagination?: PaginationParameters,
	selection?: {
		selectedSampleIDs: FMSId[],
		onSelectionChanged: (selectedSamples: SampleAndLibrary[]) => void
	}
	stepID: FMSId
}

const LabworkStepOverviewPanel = ({stepID, refreshing, grouping, groupingValue, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, hasFilter, clearFilters }: LabworkStepPanelProps) => {

  const dispatch = useAppDispatch()

  const [isFetchingSamples, setIsFetchingSamples] = useState(false)
  const [sampleAndLibraryList, setSampleAndLibraryList] = useState<SampleAndLibrary[]>([])

  useEffect(() => {
    clearFilters && clearFilters(false)
    const value: FilterValue = grouping===GROUPING_CREATION_DATE ? {min: groupingValue, max: groupingValue} : groupingValue
    setFilterOptions && setFilterOptions(grouping.key, 'exactMatch', true, grouping)
    setFilter && setFilter(grouping.key, value, grouping)
	}, [clearFilters, dispatch, grouping, groupingValue, setFilter, setFilterOptions, stepID])

  useEffect(() => {
	(async () => {
		setIsFetchingSamples(true)
		const samples = await dispatch(loadSamplesAtStep(stepID, 1))
		setSampleAndLibraryList(await fetchSamplesAndLibraries(samples.map((sample) => sample.id)))
		setIsFetchingSamples(false)
	})()
  }, [dispatch, filters, stepID])

	return (
		<>
			<WorkflowSamplesTable
				hasFilter={hasFilter}
				samples={sampleAndLibraryList}
				columns={columns}
				filterDefinitions={filterDefinitions}
				filterKeys={filterKeys}
				filters={filters}
				setFilter={setFilter}
				setFilterOptions={setFilterOptions}
				selection={selection}
				setSortBy={setSortBy}
				pagination={pagination}
				loading={refreshing || isFetchingSamples}
			/>
		</>
	)
}

export default LabworkStepOverviewPanel
