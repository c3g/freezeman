import { Collapse, Typography, Button, Space, Tag, notification } from 'antd'
import React, { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FILTER_TYPE } from '../../../constants'
import { getLabworkStepSummary, setSelectedSamples, setSelectedSamplesInGroups, unselectSamples } from '../../../modules/labworkSteps/actions'
import GroupingButton from '../../GroupingButton'
import LabworkStepOverviewPanel from './LabworkStepOverviewPanel'
import { selectLabworkStepSummaryState } from '../../../selectors'
import { Step } from '../../../models/frontend_models'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, FilterValue, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { LabworkStepSamples, LabworkStepSamplesGroup } from '../../../modules/labworkSteps/models'
import { mergeArraysIntoSet } from '../../../utils/mergeArraysIntoSet'

const { Title } = Typography

export interface LabworkStepOverviewProps {
  step: Step,
  refreshing: boolean
  stepSamples: LabworkStepSamples
	columns: IdentifiedTableColumnType<SampleAndLibrary>[]
	hasFilter: boolean,
	clearFilters?: (refresh?: boolean) => void,
	filterDefinitions?: FilterDescriptionSet,
	filterKeys?: FilterKeySet,
	filters?: FilterSet,
	setFilter?: (filterKey: string, value: FilterValue, description: FilterDescription, refresh?: boolean) => void,
	setFilterOptions?: (filterKey: string, property: string, value: boolean, description: FilterDescription, refresh?: boolean) => void,
	sortBy?: SortBy,
	setSortBy?: SetSortByFunc,
	pagination?: PaginationParameters,
	selection?: {
		selectedSampleIDs: FMSId[],
		onSelectionChanged: (selectedSamples: SampleAndLibrary[]) => void
	}
}

const MAX_STEP_SAMPLE_SELECTION = 1000

// If the filters do not work as expectd, check the filtering rules for sample_next_step endpoint (e.g. /backend/fms_core/viewsets/_constants.py, /backend/fms_core/filters.py)
export const GROUPING_PROJECT = {type: FILTER_TYPE.INPUT, label: "Project", key: "project_name"}
export const GROUPING_CONTAINER = {type: FILTER_TYPE.INPUT, label: "Container", key: "ordering_container_name"}
export const GROUPING_CREATION_DATE = {type: FILTER_TYPE.DATE_RANGE, label: "Creation Date", key: "sample__creation_date"}
export const GROUPING_CREATED_BY = {type: FILTER_TYPE.INPUT, label: "Created By", key: "sample__created_by__username"}

const LabworkStepOverview = ({step, refreshing, stepSamples, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, clearFilters }: LabworkStepOverviewProps) => {
  const dispatch = useAppDispatch()
  const [activeGrouping, setActiveGrouping] = useState<FilterDescription>(GROUPING_PROJECT)
  const labworkStepSummary = useAppSelector(selectLabworkStepSummaryState)

  const loading = refreshing  || labworkStepSummary.isFetching

  useEffect(() => {
    dispatch(getLabworkStepSummary(step.id, activeGrouping.key, {})).then(() => {
      dispatch(setSelectedSamplesInGroups(stepSamples.selectedSamples.items))
    })
  }, [])  // Fetches the initial labwork step summary

  useEffect(() => {
        dispatch(setSelectedSamplesInGroups(stepSamples.selectedSamples.items))
  }, [dispatch, stepSamples.selectedSamples.items])

  const handleChangeActiveGrouping = useCallback((grouping) => {
    clearFilters && clearFilters(false)
    dispatch(getLabworkStepSummary(step.id, grouping.key, {})).then(() => {
      dispatch(setSelectedSamplesInGroups(stepSamples.selectedSamples.items))
      setActiveGrouping(grouping) // use within then to prevent a mismatch between the current summary and the active grouping.
    })
  }, [clearFilters, dispatch, step.id, stepSamples.selectedSamples.items])

  const handleSelectGroup = useCallback(async (groupSampleIds: FMSId[]) => {
    const mergedSelection = mergeArraysIntoSet(stepSamples.selectedSamples.items, groupSampleIds)
    if (mergedSelection.length > MAX_STEP_SAMPLE_SELECTION) {
      const TOO_MANY_SELECTED_NOTIFICATION_KEY = `LabworkStep.too-many-sample-selected-${step.id}`
        notification.error({
          message: `Too many samples selected. Keep selection under ` + MAX_STEP_SAMPLE_SELECTION + `.`,
          key: TOO_MANY_SELECTED_NOTIFICATION_KEY,
          duration: 5
        })
    }
    else {
      dispatch(setSelectedSamples(step.id, mergedSelection))
    }
  }, [stepSamples.selectedSamples.items, step.id, dispatch])

  const handleClearGroup = useCallback((groupSampleIds: FMSId[]) => {
    dispatch(unselectSamples(step.id, groupSampleIds))
  }, [dispatch, step.id])

	return (
		<>
      <div>
        <GroupingButton grouping={GROUPING_PROJECT} selected={activeGrouping===GROUPING_PROJECT} refreshing={labworkStepSummary.isFetching} onClick={handleChangeActiveGrouping}/>
				<GroupingButton grouping={GROUPING_CONTAINER} selected={activeGrouping===GROUPING_CONTAINER} refreshing={labworkStepSummary.isFetching} onClick={handleChangeActiveGrouping}/>
        <GroupingButton grouping={GROUPING_CREATION_DATE} selected={activeGrouping===GROUPING_CREATION_DATE} refreshing={labworkStepSummary.isFetching} onClick={handleChangeActiveGrouping}/>
        <GroupingButton grouping={GROUPING_CREATED_BY} selected={activeGrouping===GROUPING_CREATED_BY} refreshing={labworkStepSummary.isFetching} onClick={handleChangeActiveGrouping}/>
      </div>
      <div style={{ display: 'flex', marginBottom: '1em' }}></div>
			<Collapse accordion destroyInactivePanel={true} collapsible={labworkStepSummary.isFetching ? 'disabled' : 'icon'}>
				{labworkStepSummary && labworkStepSummary.groups?.map((group: LabworkStepSamplesGroup) => {
          const sample_ids = Object.keys(group.sample_locators).map((id) => Number(id))
          const selectedCount = Object.keys(group.selected_samples).length
          const ButtonsSelectAndClear = (
            <Space direction="horizontal" style={{width: '100%', justifyContent: 'center'}}>
              <Tag><Title style={{ margin: 0 }} level={4}>{`${selectedCount}/${group.count}`}</Title></Tag>
              <Button disabled={loading || group.count === 0 || selectedCount === group.count} title='Select group samples' onClick={() => handleSelectGroup(sample_ids)}>Select All</Button>
              <Button disabled={loading || selectedCount === 0} title='Deselect group samples' onClick={() => handleClearGroup(sample_ids)}>Clear Selection</Button>
            </Space>
          )

					return (
						<Collapse.Panel key={group.name} header={group.name} extra={ButtonsSelectAndClear}>
							<LabworkStepOverviewPanel
							  refreshing={refreshing || labworkStepSummary.isFetching}
							  grouping={activeGrouping}
							  groupingValue={group.name}
							  clearFilters={clearFilters}
							  hasFilter={true}
							  columns={columns}
							  filterDefinitions={filterDefinitions}
							  filterKeys={filterKeys}
							  filters={filters}
							  setFilter={setFilter}
							  setFilterOptions={setFilterOptions}
							  selection={selection}
                sortBy={sortBy}
							  setSortBy={setSortBy}
							  pagination={pagination}
							  stepID={step.id}
							/>
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

export default LabworkStepOverview