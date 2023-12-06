import React, { useEffect } from 'react'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable, { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'

interface LabworkStepPanelProps {
  grouping: FilterDescription
  groupingValue: FilterValue
  samples: SampleAndLibrary[]
	columns: IdentifiedTableColumnType<SampleAndLibrary>[]
	hasFilter: boolean,
	clearFilters?: () => void,
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

const LabworkStepOverviewPanel = ({grouping, groupingValue, samples, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, hasFilter, clearFilters }: LabworkStepPanelProps) => {

  useEffect(() => {
    setFilter && setFilter(grouping.key, groupingValue, grouping)
	}, [grouping, groupingValue])

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
      />
		</>
	)
}

export default LabworkStepOverviewPanel