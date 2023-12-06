import React, { useEffect } from 'react'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { useAppDispatch } from '../../../hooks'
import WorkflowSamplesTable from '../../WorkflowSamplesTable/WorkflowSamplesTable'

interface LabworkStepPanelProps {
  grouping: FilterDescription
  groupingValue: string
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

	const dispatch = useAppDispatch()

  useEffect(() => {
    setFilter && dispatch(setFilter(grouping.key, groupingValue, grouping))
	}, [grouping, groupingValue])

	return (
		<>
      <WorkflowSamplesTable
				clearFilters={clearFilters}
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