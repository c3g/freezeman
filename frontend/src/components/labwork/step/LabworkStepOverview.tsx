import { Collapse, Typography, Button, Space, Tag, notification } from 'antd'
import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FILTER_TYPE } from '../../../constants'
import { getLabworkStepSummary, setSelectedSamples, setSelectedSamplesInGroups, updateSelectedSamplesAtStep } from '../../../modules/labworkSteps/actions'
import GroupingButton from '../../GroupingButton'
import LabworkStepOverviewPanel from './LabworkStepOverviewPanel'
import { selectLabworkStepSummaryState } from '../../../selectors'
import { Step, Sample } from '../../../models/frontend_models'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { LabworkStepSamples, LabworkStepSamplesGroup } from '../../../modules/labworkSteps/models'
import { mergeArraysIntoSet } from '../../../utils/mergeArraysIntoSet'
import { fetchLibrariesForSamples, fetchSamples } from "../../../modules/cache/cache"

const { Title } = Typography

interface LabworkStepCollapseProps {
  step: Step,
  refreshing: boolean
  setIsSorted: (sorted: boolean) => void
  stepSamples: LabworkStepSamples
  samples: SampleAndLibrary[]
	columns: IdentifiedTableColumnType<SampleAndLibrary>[]
	hasFilter: boolean,
	clearFilters?: (refresh?: boolean) => void,
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

const MAX_STEP_SAMPLE_SELECTION = 1000

// If the filters do not work as expectd, check the filtering rules for sample_next_step endpoint (e.g. /backend/fms_core/viewsets/_constants.py, /backend/fms_core/filters.py)
export const GROUPING_PROJECT = {type: FILTER_TYPE.INPUT, label: "Project", key: "sample__derived_samples__project__name"}
export const GROUPING_CONTAINER = {type: FILTER_TYPE.INPUT, label: "Container", key: "ordering_container_name"}
export const GROUPING_CREATION_DATE = {type: FILTER_TYPE.DATE_RANGE, label: "Creation Date", key: "sample__creation_date"}
export const GROUPING_CREATED_BY = {type: FILTER_TYPE.INPUT, label: "Created By", key: "sample__created_by__username"}

const LabworkStepOverview = ({step, refreshing, setIsSorted, stepSamples, samples, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, clearFilters }: LabworkStepCollapseProps) => {
	const dispatch = useAppDispatch()
  const [activeGrouping, setActiveGrouping] = useState<FilterDescription>(GROUPING_PROJECT)
  const labworkStepSummary = useAppSelector(selectLabworkStepSummaryState)
  const [FetchingSamples, setFetchingSamples] = useState<boolean>(false)
  
  useEffect(() => {
    dispatch(getLabworkStepSummary(step.id, activeGrouping.key, {}))
    dispatch(setSelectedSamplesInGroups(stepSamples.selectedSamples))
  }, [activeGrouping, step])

  const handleChangeActiveGrouping = (grouping) => {
    clearFilters && clearFilters(false)
    setActiveGrouping(grouping)
  }

  const handleSelectGroup = async (groupSampleIds: FMSId[]) => {
    const mergedSelection = mergeArraysIntoSet(stepSamples.selectedSamples, groupSampleIds)
    if (mergedSelection.length > MAX_STEP_SAMPLE_SELECTION) {
      const TOO_MANY_SELECTED_NOTIFICATION_KEY = `LabworkStep.too-many-sample-selected-${step.id}`
        notification.error({
          message: `Too many samples selected. Keep selection under ` + MAX_STEP_SAMPLE_SELECTION + `.`,
          key: TOO_MANY_SELECTED_NOTIFICATION_KEY,
          duration: 5
        })
    }
    else {
      setIsSorted(false)
      setFetchingSamples(true)
      await fetchSamples(mergedSelection)
      await fetchLibrariesForSamples(mergedSelection)	
      dispatch(updateSelectedSamplesAtStep(step.id, mergedSelection))
      setFetchingSamples(false)
    }
  }

  const handleClearGroup = (groupSampleIds: FMSId[]) => {    
    dispatch(updateSelectedSamplesAtStep(step.id, stepSamples.selectedSamples.filter(id => !groupSampleIds.includes(id))))
  }

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
          const ButtonsSelectAndClear = (
            <Space direction="horizontal" style={{width: '100%', justifyContent: 'center'}}>
              <Tag><Title style={{ margin: 0 }} level={4}>{`${Object.keys(group.selected_samples).length}/${group.count}`}</Title></Tag>
              <Button disabled={!group.count} title='Select group samples' onClick={() => handleSelectGroup(sample_ids)}>Select All</Button>
              <Button disabled={stepSamples.selectedSamples.length === 0} title='Deselect group samples' onClick={() => handleClearGroup(sample_ids)}>Clear Selection</Button>
            </Space>
          )

					return (
						<Collapse.Panel key={group.name} header={group.name} extra={ButtonsSelectAndClear}>
							<LabworkStepOverviewPanel
                refreshing={refreshing || FetchingSamples || labworkStepSummary.isFetching}
                grouping={activeGrouping}
                groupingValue={group.name}
                clearFilters={clearFilters}
							  hasFilter={true}
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
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

export default LabworkStepOverview
