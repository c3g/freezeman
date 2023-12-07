import { Collapse, Typography, Button } from 'antd'
import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FILTER_TYPE } from '../../../constants'
import { getLabworkStepSummary } from '../../../modules/labworkSteps/actions'
import GroupingButton from '../../GroupingButton'
import LabworkStepOverviewPanel from './LabworkStepOverviewPanel'
import { selectLabworkStepSummaryState } from '../../../selectors'
import { Step, Sample } from '../../../models/frontend_models'
import { FMSId } from '../../../models/fms_api_models'
import { IdentifiedTableColumnType } from '../../pagedItemsTable/PagedItemsColumns'
import { SampleAndLibrary } from '../../WorkflowSamplesTable/ColumnSets'
import { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc, SetSortByFunc, SortBy } from '../../../models/paged_items'
import { LabworkStepSamplesGroup } from '../../../modules/labworkSteps/models'

const { Title } = Typography

interface LabworkStepCollapseProps {
  step: Step,
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

export const GROUPING_PROJECT = {type: FILTER_TYPE.INPUT, label: "Project", key: "sample__derived_samples__project__name"}
export const GROUPING_CONTAINER = {type: FILTER_TYPE.INPUT, label: "Container", key: "ordering_container_name"}
export const GROUPING_CREATION_DATE = {type: FILTER_TYPE.DATE_RANGE, label: "Creation Date", key: "sample__creation_date"}
export const GROUPING_CREATED_BY = {type: FILTER_TYPE.INPUT, label: "Created By", key: "sample__created_by__username"}

export const INITIAL_FILTER = {
  [GROUPING_PROJECT.key]: undefined,
  [GROUPING_CONTAINER.key]: undefined,
  [GROUPING_CREATION_DATE.key]: undefined,
  [GROUPING_CREATED_BY.key]: undefined
}

const LabworkStepOverview = ({step, samples, columns, filterDefinitions, filterKeys, filters, setFilter, setFilterOptions, sortBy, setSortBy, pagination, selection, clearFilters }: LabworkStepCollapseProps) => {
	const dispatch = useAppDispatch()
  const [activeGrouping, setActiveGrouping] = useState<FilterDescription>(GROUPING_PROJECT)
  const labworkStepSummary = useAppSelector(selectLabworkStepSummaryState)
  
  useEffect(() => {
    dispatch(getLabworkStepSummary(step.id, activeGrouping.key, {}))
	}, [activeGrouping, step])

  const handleChangeActiveGrouping = (grouping) => {
    clearFilters && clearFilters()
    setActiveGrouping(grouping)
  }

  const handleChangePanel = (key) => {
    clearFilters && clearFilters()
    const value = activeGrouping===GROUPING_CREATION_DATE ? {min: key, max: key} : key
    setFilter && setFilter(activeGrouping.key, value, activeGrouping)
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
			<Collapse accordion onChange={handleChangePanel} destroyInactivePanel={true} collapsible={labworkStepSummary.isFetching ? 'disabled' : undefined}>
				{labworkStepSummary && labworkStepSummary.groups?.map((group: LabworkStepSamplesGroup) => {
          //const ButtonsSelectAndClear = (
          //  <>
          //    <Button disabled={!group.count} title='Select group samples' onClick={handleSelectGroup(group.sample_ids)}>Select All</Button>
          //    <Button disabled={!group.count} title='Deselect group samples' onClick={handleClearGroup(group.sample_ids)}>Clear Selection</Button>
          //  </>
          //)

					return (
						<Collapse.Panel key={group.name} header={group.name} extra={<Title level={4}>{group.count}</Title>}>
							<LabworkStepOverviewPanel
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
