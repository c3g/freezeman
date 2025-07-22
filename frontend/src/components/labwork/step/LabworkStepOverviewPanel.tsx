import React, { useCallback, useEffect, useState } from 'react'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibraryAndIdentity } from '../../WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable, { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { GROUPING_CREATION_DATE, LabworkStepOverviewProps } from './LabworkStepOverview'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { selectLabworkStepsState } from '../../../selectors'
import { loadSampleNextStepsAtStep } from '../../../modules/labworkSteps/actions'
import { fetchSamplesAndLibrariesAndIdentities } from '../../../modules/studySamples/services'

export interface LabworkStepPanelProps {
	refreshing: boolean
	grouping: FilterDescription
	groupingValue: string
	columns: IdentifiedTableColumnType<SampleAndLibraryAndIdentity>[]
	hasFilter: boolean,
	clearFilters?: (boolean?) => void,
	filterDefinitions?: FilterDescriptionSet,
	filterKeys?: FilterKeySet,
	filters?: FilterSet,
	setFilter?: NonNullable<LabworkStepOverviewProps['setFilter']>,
	setFilterOptions?: NonNullable<LabworkStepOverviewProps['setFilterOptions']>,
	sortByList: SortBy[],
	setSortByList?: SetSortByFunc,
	pagination?: PaginationParameters,
	selection?: {
		selectedSampleIDs: FMSId[],
		onSelectionChanged: (selectedSamples: SampleAndLibraryAndIdentity[]) => void
	}
	stepID: FMSId
}

const LabworkStepOverviewPanel = ({ stepID, refreshing, grouping, groupingValue, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortByList, setSortByList, pagination, selection, hasFilter, clearFilters }: LabworkStepPanelProps) => {

	const dispatch = useAppDispatch()

	const [isFetchingSamples, setIsFetchingSamples] = useState(false)
	const [sampleAndLibraryList, setSampleAndLibraryList] = useState<SampleAndLibraryAndIdentity[]>([])
  const displayedSamples = useAppSelector((state) => selectLabworkStepsState(state).steps[stepID].displayedSamples)

	useEffect(() => {
		clearFilters && clearFilters(false)
		const value: FilterValue = grouping === GROUPING_CREATION_DATE ? { min: groupingValue, max: groupingValue } : groupingValue
		setFilterOptions && setFilterOptions(grouping.key, 'exactMatch', true, grouping, false)
		setFilter && setFilter(grouping.key, value, grouping, false)
	}, [clearFilters, dispatch, grouping, groupingValue, setFilter, setFilterOptions, stepID])

	const initialSampleFetch = useCallback(async () => {
		setIsFetchingSamples(true)
		if (!pagination?.pageNumber || !pagination?.pageSize || !filters || !filters[grouping.key]) {
			return
		}
		const samples = await dispatch(loadSampleNextStepsAtStep(stepID, pagination.pageNumber, pagination.pageSize))
		setSampleAndLibraryList(await fetchSamplesAndLibrariesAndIdentities(samples.results.map((sample) => sample.sample)))
		setIsFetchingSamples(false)
	}, [dispatch, filters, grouping.key, pagination?.pageNumber, pagination?.pageSize, stepID])

	useEffect(() => {
		initialSampleFetch()
	}, [initialSampleFetch])

  useEffect(() => {
    const updateDisplay = async () => setSampleAndLibraryList(await fetchSamplesAndLibrariesAndIdentities(displayedSamples))
    updateDisplay()
  }, [displayedSamples]) // Triggers off filters instead of displayed samples to prevent endless loop. TODO fix loopy behaviour ... 

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
				sortByList={sortByList}
				setSortByList={setSortByList}
				pagination={pagination}
				loading={refreshing || isFetchingSamples}
			/>
		</>
	)
}

export default LabworkStepOverviewPanel
