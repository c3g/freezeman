import React, { useEffect } from 'react'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable, { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { GROUPING_CREATION_DATE } from './LabworkStepOverview'
import { useAppDispatch, useAppSelector, useSampleAndLibraryList } from '../../../hooks'
import { loadSamplesAtStep } from '../../../modules/labworkSteps/actions'
import { selectLabworkStepsState } from '../../../selectors'

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

  const stepSamples = useAppSelector(selectLabworkStepsState)?.steps[stepID]
  const [samples, isFetchingSamples] = useSampleAndLibraryList(stepSamples?.displayedSamples ?? [])

  useEffect(() => {
    clearFilters && clearFilters(false)
    const value: FilterValue = grouping===GROUPING_CREATION_DATE ? {min: groupingValue, max: groupingValue} : groupingValue
    setFilterOptions && setFilterOptions(grouping.key, 'exactMatch', true, grouping)
    setFilter && setFilter(grouping.key, value, grouping)
	}, [clearFilters, dispatch, grouping, groupingValue, setFilter, setFilterOptions, stepID])

  useEffect(() => {
    dispatch(loadSamplesAtStep(stepID, 1))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

	return (
		<>
			<WorkflowSamplesTable
				hasFilter={hasFilter}
				samples={samples}
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
