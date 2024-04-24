import { Button, Popconfirm, Radio, Select, Space, Tabs, Typography, notification, Tooltip } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_PAGINATION_LIMIT } from '../../../config'
import { useAppDispatch } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol, Step } from '../../../models/frontend_models'
import { FilterDescription, FilterValue, SortBy } from '../../../models/paged_items'
import { clearFilters, clearSelectedSamples, flushSamplesAtStep, loadSamplesAtStep, refreshSamplesAtStep, requestPrefilledTemplate, requestAutomationExecution, setFilter, setFilterOptions, setSelectedSamplesSortDirection, setSortBy, setSelectedSamples, prefillTemplate } from '../../../modules/labworkSteps/actions'
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { setPageSize } from '../../../modules/pagination'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import PrefillButton from '../../PrefillTemplateColumns'
import RefreshButton from '../../RefreshButton'
import ExecuteAutomationButton from './AdditionalAutomationData'
import { getColumnsForStep } from '../../WorkflowSamplesTable/ColumnSets'
import { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS } from '../../libraries/LibraryTableColumns'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS, SampleColumnID } from '../../samples/SampleTableColumns'
import LabworkStepOverview, { GROUPING_CONTAINER, GROUPING_CREATED_BY } from './LabworkStepOverview'
import LabworkSelection from './LabworkSelection'
import Placement from '../../placementVisuals/Placement'
import { flushContainers } from '../../../modules/placement/reducers'

const { Text } = Typography

interface LabworkStepPageProps {
	protocol: Protocol | undefined
	step: Step
	stepSamples: LabworkStepSamples
}


const LabworkStep = ({ protocol, step, stepSamples }: LabworkStepPageProps) => {

	const dispatch = useAppDispatch()
	const navigate = useNavigate()
	
	// Keep track of the currently selected tab so that we can tweak the UX
	const GROUPED_SAMPLES_TAB_KEY = 'groups'
	const SELECTION_TAB_KEY = 'selection'
	const PLACEMENT_TAB_KEY = 'placement'
	const [selectedTab, setSelectedTab] = useState<string>(GROUPED_SAMPLES_TAB_KEY)
	const [waitResponse, setWaitResponse] = useState<boolean>(false)
	const isAutomationStep = protocol === undefined && step.type === "AUTOMATION"

	// ** Refresh **

	const isRefreshing = stepSamples.pagedItems.isFetching
	const handleRefresh = useCallback(
		() => { dispatch(refreshSamplesAtStep(step.id)) }
		, [step, dispatch])

	// ** Template handling **

	// A selected template picker is used if protocol supports more than one template
	const [selectedTemplate, setSelectedTemplate] = useState<LabworkPrefilledTemplateDescriptor>()

	// Set the currently selected template to the first template available, if not already set.
	useEffect(() => {
		if (!selectedTemplate) {
			if (stepSamples.prefill.templates.length > 0) {
				const template = stepSamples.prefill.templates[0]
				setSelectedTemplate(template)
			} else if (stepSamples.action.templates.length > 0) {
				const template = stepSamples.action.templates[0]
				setSelectedTemplate(template)
			} else if (isAutomationStep) {
				setSelectedTemplate(undefined)
			} else {
				console.error('No templates are associated with step!')
			}
		}
	}, [stepSamples, selectedTemplate])

	// Handle the prefill template button
	const canPrefill = selectedTemplate ? stepSamples.selectedSamples.items.length > 0 && stepSamples.prefill.templates.length > 0 : false

	const handlePrefillTemplate = useCallback(
		async (prefillData: { [column: string]: any }) => {
			if (selectedTemplate) {
				dispatch(prefillTemplate(selectedTemplate, step, prefillData))
			}
		}
		, [dispatch, selectedTemplate, step])

	// Submit Automation handler
	const haveSelectedSamples = stepSamples.selectedSamples.items.length > 0
	// Submit Template handler
	const canSubmit = selectedTemplate && selectedTemplate.submissionURL

	const handleSubmitTemplate = useCallback(
		() => {
			dispatch(flushSamplesAtStep(step.id))
			if (selectedTemplate && selectedTemplate.submissionURL) {
				navigate(selectedTemplate.submissionURL)
			}
		}
		, [step, selectedTemplate, navigate, dispatch])

	const handleExecuteAutomation = useCallback(
		async (additionalData) => {
			try {
				setWaitResponse(true)
				const response = await dispatch(requestAutomationExecution(step.id, additionalData))
				if (response) {
					setWaitResponse(false)
					const success = response.data.result.success
					if (success) {
						dispatch(flushSamplesAtStep(step.id))
						const AUTOMATION_SUCCESS_NOTIFICATION_KEY = `LabworkStep.automation-success-${step.id}`
						notification.info({
							message: `Automation completed with success. Moving samples to next step.`,
							key: AUTOMATION_SUCCESS_NOTIFICATION_KEY,
							duration: 5
						})
						navigate(`/lab-work/`)
					}
					else {
						const AUTOMATION_FAILED_NOTIFICATION_KEY = `LabworkStep.automation-failure-${step.id}`
						const errors = response.data.errors
						notification.error({
							message: `Automation failed. Errors:${Object.values(errors).filter(value => (typeof value === "string" && value.length > 0)).map(value => "[" + value + "]")}`,
							key: AUTOMATION_FAILED_NOTIFICATION_KEY,
							duration: 20
						})
					}
				}
			} catch (err) {
				setWaitResponse(false)
				console.error(err)
			}
		}
		, [step, dispatch])

	/** Table columns **/

	// Memoizing these cuts down on table re-renders. Without it, the samples tables render 6 times
	// when they are initially visible.
	const columnsForSamples = useMemo(() => {
		return getColumnsForStep(step, protocol)
	}, [step, protocol])

	const filterDefinitions = useMemo(() => {
		return {
			...SAMPLE_COLUMN_FILTERS,
			...LIBRARY_COLUMN_FILTERS,
			GROUPING_CONTAINER,
			GROUPING_CREATED_BY
		}
	}, [])

	const filterKeys = useMemo(() => {
		return {
			...SAMPLE_NEXT_STEP_FILTER_KEYS,
			...SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS,
			[GROUPING_CONTAINER.label]: GROUPING_CONTAINER.key,
			[GROUPING_CREATED_BY.label]: GROUPING_CREATED_BY.key
		}
	}, [])

	// ** Table filtering and sorting ***

	const handleSetFilter = useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			if (typeof description === 'undefined') {
				return
			}
			dispatch(setFilter(step.id, description, value, false))
		}, [step, dispatch]
	)

	const handleSetFilterOptions = useCallback(
		(filterKey: string, property: string, value: boolean, description: FilterDescription) => {
			if (typeof description === 'undefined') {
				return
			}
			dispatch(setFilterOptions(step.id, description, { [property]: value }, false))
		}
		, [step, dispatch])

	const handleSetSortBy = useCallback(
		(sortBy: SortBy) => {
			dispatch(setSortBy(step.id, sortBy))
		},
		[step, dispatch]
	)

	// ** Pagination for samples table **

	const handlePageNumber = useCallback(
		(pageNumber: number) => {
			dispatch(loadSamplesAtStep(step.id, pageNumber))
		}
		, [step, dispatch])

	const handlePageSize = useCallback(
		(pageSize: number) => {
			dispatch(setPageSize(pageSize))
			dispatch(loadSamplesAtStep(step.id, stepSamples.pagedItems.page?.pageNumber ?? 1))
		}
		, [step, stepSamples, dispatch])

	const pagination: PaginationParameters = {
		pageNumber: stepSamples.pagedItems.page?.pageNumber ?? 1,
		totalCount: stepSamples.pagedItems.totalCount,
		pageSize: stepSamples.pagedItems.page?.limit ?? DEFAULT_PAGINATION_LIMIT,
		onChangePageNumber: handlePageNumber,
		onChangePageSize: handlePageSize
	}

	/** Selection Handling **/

	// When the user selects or deselects samples in the table, the table gives us the new selection.
	// The selection, however, only covers the page of samples that are currently displayed in the table.
	// It does not include samples that were selected on any other page of samples.
	// This function takes the complete list of selected samples, and merges the selection from the current
	// page of samples into it.
	function mergeSelectionChange(totalSelection: FMSId[], displayedSamples: FMSId[], selectedSampleIDs: FMSId[]): FMSId[] {

		let mergedSelection = [...totalSelection]

		// Add selected samples to merged selection unless they are already included in the merged selection.
		selectedSampleIDs.forEach(id => {
			if (!mergedSelection.includes(id)) {
				mergedSelection.push(id)
			}
		})

		// Remove any samples that are no longer selected in the table from the merged selection, if present.
		const unselectedSampleIDs = displayedSamples.filter(id => !selectedSampleIDs.includes(id))
		mergedSelection = mergedSelection.filter(id => !unselectedSampleIDs.includes(id))

		return mergedSelection
	}

	const handleClearSelection = useCallback(
		() => {
			dispatch(clearSelectedSamples(step.id))
			onTabChange(GROUPED_SAMPLES_TAB_KEY)
		}
		, [step, dispatch])
	// Selection handler for sample selection checkboxes
	const onSelectChange = useCallback((selectedSamples) => {
		const displayedSelection = getIdsFromSelectedSamples(selectedSamples)
		const mergedSelection = mergeSelectionChange(stepSamples.selectedSamples.items, stepSamples.displayedSamples, displayedSelection)
		dispatch(setSelectedSamples(step.id, mergedSelection))
	}, [step, stepSamples, dispatch])

	const getIdsFromSelectedSamples = useCallback((selectedSamples) => {
		const ids = selectedSamples.reduce((acc, selected) => {
			if (selected.sample) {
				acc.push(selected.sample.id)
			}
			return acc
		}, [] as FMSId[])
		return ids;
	}, [])

	// Selection handler for sample selection checkboxes
	const selectionProps = useCallback((onSelectionChangeCallback) => {
		return {
			selectedSampleIDs: stepSamples.selectedSamples.items,
			clearAllSamples: () => handleClearSelection(),
			onSelectionChanged: onSelectionChangeCallback,
		}
	}, [handleClearSelection, stepSamples.selectedSamples.items])

	/** Sorting by coordinate **/

	const handleCoordinateSortOrientation = useCallback((value: string) => {
		switch (value) {
			case 'row': {
				dispatch(setSelectedSamplesSortDirection(step.id, { ...stepSamples.selectedSamples.sortDirection, orientation: 'row' }))
				break
			}
			case 'column': {
				dispatch(setSelectedSamplesSortDirection(step.id, { ...stepSamples.selectedSamples.sortDirection, orientation: 'column' }))
				break
			}
		}
	}, [dispatch, step, stepSamples.selectedSamples.sortDirection])

	const handleSelectionTableSortChange = useCallback((sortBy: SortBy) => {
		if (sortBy.key === SampleColumnID.COORDINATES && sortBy.order) {
			dispatch(setSelectedSamplesSortDirection(step.id, { ...stepSamples.selectedSamples.sortDirection, order: sortBy.order }))
		}
	}, [step.id, stepSamples.selectedSamples.sortDirection, dispatch])

	const localClearFilters = useCallback((refresh: boolean = true) => {
		if (clearFilters)
			dispatch(clearFilters(step.id, refresh))
	}, [step, step.id])

	const onTabChange = useCallback((tabKey) => {
		setSelectedTab(tabKey)
	}, [step.id])

	useEffect(() => {
		if (stepSamples.selectedSamples.items.length === 0) {
			onTabChange(GROUPED_SAMPLES_TAB_KEY)
		}
	}, [onTabChange, stepSamples.selectedSamples.items.length])

	const onPrefillOpen = useCallback(() => {
	}, [])

	/** Flushing */
	useEffect(() => {
		return () => {
			dispatch(clearSelectedSamples(step.id))
			dispatch(flushSamplesAtStep(step.id))
			dispatch(flushContainers())
		}
	}, [dispatch, step.id])

	/** UX **/

	// Display the number of selected samples in the tab title
	const selectedTabTitle = `Selection (${stepSamples.selectedSamples.items.length} ${stepSamples.selectedSamples.items.length === 1 ? "sample" : "samples"} selected)`
	const buttonBar = (
		<Space>
			{stepSamples.prefill.templates.length > 1 &&
				<>
					<Text strong>Template:</Text>
					<Select
						defaultActiveFirstOption
						style={{ width: '24em' }}
						value={selectedTemplate?.id ?? 0}
						options={stepSamples.prefill.templates.map(template => {
							return {
								value: template.id,
								label: template.description
							}
						})}
						onChange={value => {
							const template = stepSamples.prefill.templates.find(template => template.id === value)
							if (template) {
								setSelectedTemplate(template)
							}
						}}
					/>
				</>
			}
			{!isAutomationStep &&
				<>
					<PrefillButton onPrefillOpen={onPrefillOpen} canPrefill={canPrefill} handlePrefillTemplate={handlePrefillTemplate} data={selectedTemplate?.prefillFields ?? []}></PrefillButton>
					<Button type='default' disabled={!canSubmit} onClick={handleSubmitTemplate} title='Submit a template'>Submit Template</Button>
				</>
			}
			{isAutomationStep &&
				<>
					<ExecuteAutomationButton waitResponse={waitResponse} canExecute={haveSelectedSamples} handleExecuteAutomation={handleExecuteAutomation} step={step} data={stepSamples.selectedSamples.items} />
				</>
			}
			<RefreshButton
				refreshing={isRefreshing}
				onRefresh={handleRefresh}
				title='Refresh the list of samples'
			/>
		</Space>
	)

	return (
		<>
			<AppPageHeader title={step.name} extra={buttonBar} />
			<PageContent loading={stepSamples.pagedItems.isFetching} >
				<Tabs defaultActiveKey={GROUPED_SAMPLES_TAB_KEY} activeKey={selectedTab} destroyInactiveTabPane tabBarExtraContent={
					<Space>
						{selectedTab === SELECTION_TAB_KEY &&
							<>
								<Typography.Text>Sort Coordinates: </Typography.Text>
								<Radio.Group
									value={stepSamples.selectedSamples.sortDirection.orientation}
									onChange={(evt) => { evt.target && handleCoordinateSortOrientation(evt.target.value) }}
								>
									<Radio.Button value='row'>by Row</Radio.Button>
									<Radio.Button value='column'>by Column</Radio.Button>
								</Radio.Group>
							</>
						}
						<Popconfirm
							disabled={stepSamples.selectedSamples.items.length == 0}
							title={'Clear the entire selection?'}
							okText={'Yes'}
							cancelText={'No'}
							placement={'rightTop'}
							onConfirm={() => handleClearSelection()}
						>
							<Button disabled={stepSamples.selectedSamples.items.length == 0} title='Deselect all samples'>Clear Selection</Button>
						</Popconfirm>
					</Space>
				} onChange={onTabChange}>
					<Tabs.TabPane tab='Samples' key={GROUPED_SAMPLES_TAB_KEY}>
						<LabworkStepOverview
							step={step}
							refreshing={isRefreshing}
							stepSamples={stepSamples}
							clearFilters={localClearFilters}
							hasFilter={true}
							columns={columnsForSamples}
							filterDefinitions={filterDefinitions}
							filterKeys={filterKeys}
							filters={stepSamples.pagedItems.filters}
							setFilter={handleSetFilter}
							setFilterOptions={handleSetFilterOptions}
							selection={selectionProps(onSelectChange)}
							setSortBy={handleSetSortBy}
							pagination={pagination}
						/>
					</Tabs.TabPane>
					<Tabs.TabPane tab={selectedTabTitle} key={SELECTION_TAB_KEY}>
						<LabworkSelection
							stepSamples={stepSamples}
							step={step}
							protocol={protocol}
							setSortBy={handleSelectionTableSortChange}
						/>
					</Tabs.TabPane>
					{step.needs_placement ?
						<Tabs.TabPane tab={<Tooltip title="Place selected samples">Placement</Tooltip>} key={PLACEMENT_TAB_KEY} disabled={stepSamples.selectedSamples.items.length == 0}>
							<Placement
								stepID={step.id}
								sampleIDs={stepSamples.selectedSamples.items}
							/>
						</Tabs.TabPane>
						: ''}
				</Tabs>
			</PageContent>
		</>
	)
}

export default LabworkStep
