import React, { useEffect } from 'react'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable, { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { GROUPING_CREATION_DATE } from './LabworkStepOverview'

interface LabworkStepPanelProps {
  refreshing: boolean
  grouping: FilterDescription
  groupingValue: string
  samples: SampleAndLibrary[]
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
}

const LabworkStepOverviewPanel = ({refreshing, grouping, groupingValue, samples, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, hasFilter, clearFilters }: LabworkStepPanelProps) => {

  useEffect(() => {
    clearFilters && clearFilters(false)
    const value: FilterValue = grouping===GROUPING_CREATION_DATE ? {min: groupingValue, max: groupingValue} : groupingValue
    setFilter && setFilter(grouping.key, value, grouping)
	}, [groupingValue, setFilter])

	return (
		<>
      {!refreshing && <WorkflowSamplesTable
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
      />}
		</>
	)
}

export default LabworkStepOverviewPanel