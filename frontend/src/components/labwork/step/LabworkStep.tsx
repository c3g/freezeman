import { InfoCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { Alert, Button, Popconfirm, Radio, Select, Space, Tabs, Typography, notification } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_PAGINATION_LIMIT } from '../../../config'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol, Step } from '../../../models/frontend_models'
import { FilterDescription, FilterValue, SortBy } from '../../../models/paged_items'
import { clearFilters, clearSelectedSamples, flushSamplesAtStep, loadSamplesAtStep, refreshSamplesAtStep, requestPrefilledTemplate, requestAutomationExecution, setFilter, setFilterOptions, setSelectedSamplesSortDirection, setSortBy, showSelectionChangedMessage, updateSelectedSamplesAtStep, setSelectedSamples } from '../../../modules/labworkSteps/actions'
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { setPageSize } from '../../../modules/pagination'
import { selectLibrariesByID, selectSamplesByID } from '../../../selectors'
import { downloadFromFile } from '../../../utils/download'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import PrefillButton from '../../PrefillTemplateColumns'
import RefreshButton from '../../RefreshButton'
import ExecuteAutomationButton from './AdditionalAutomationData'
import { SampleAndLibrary, getColumnsForStep } from '../../WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable, { PaginationParameters } from '../../WorkflowSamplesTable/WorkflowSamplesTable'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS } from '../../libraries/LibraryTableColumns'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS, SampleColumnID } from '../../samples/SampleTableColumns'
import LabworkStepOverview, { GROUPING_CONTAINER, GROUPING_CREATED_BY } from './LabworkStepOverview'
import LibraryTransferStep from '../../libraryTransfer/LibraryTransferStep'

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
	const SAMPLES_TAB_KEY = 'samples'
	const SELECTION_TAB_KEY = 'selection'
	const PLACEMENT_TAB_KEY = 'placement'
	const [selectedTab, setSelectedTab] = useState<string>(GROUPED_SAMPLES_TAB_KEY)
	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)
	const [samples, setSamples] = useState<SampleAndLibrary[]>([])
	const [selectedTableSamples, setSelectedTableSamples] = useState<SampleAndLibrary[]>([])
	const [waitResponse, setWaitResponse] = useState<boolean>(false)
	const [isSorted, setIsSorted] = useState<boolean>(false)
	const [placementData, setPlacementData] = useState<any>({})

	const isAutomationStep = protocol === undefined && step.type === "AUTOMATION"


	useEffect(() => {
		const getSampleList = (sampleIDs) => {
			const availableSamples = sampleIDs.reduce((acc, sampleID) => {
				const sample = samplesByID[sampleID]
				if (sample) {
					if (sample.is_library) {
						const library = librariesByID[sampleID]
						acc.push({ sample, library })
					} else {
						acc.push({ sample })
					}
				}
				return acc
			}, [] as SampleAndLibrary[])
			return availableSamples
		}
		setSamples(getSampleList(stepSamples.displayedSamples))

		// This is pretty expensive. The selected samples table doesn't use pagination
		// and so all of the selected samples and libraries needed to be loaded into redux
		// for the table to work properly. It would be better if the samples and libraries
		// were loaded on demand, by page like we usually do in tables.
		setSelectedTableSamples(getSampleList(stepSamples.selectedSamples))
	}, [samplesByID, librariesByID, stepSamples])

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
	const canPrefill = selectedTemplate && stepSamples.selectedSamples.length > 0 && stepSamples.prefill.templates.length > 0

	const handlePrefillTemplate = useCallback(
		async (prefillData: { [column: string]: any }, placementData: { [id:string] : any}) => {
			if (selectedTemplate) {
				try {
					const result = await dispatch(requestPrefilledTemplate(selectedTemplate.id, step.id, prefillData, placementData))
					if (result) {
						downloadFromFile(result.filename, result.data)
					}
				} catch (err) {
					console.error(err)
				}
			}
		}
		, [step, selectedTemplate, dispatch])

	// Submit Automation handler
	const haveSelectedSamples = stepSamples.selectedSamples.length > 0
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

	// Columns for selected samples table
	const columnsForSelection = useMemo(() => {
		const columns = getColumnsForStep(step, protocol)
		// Make the Coordinates column sortable. We have to force the sorter to appear since
		// the selection table doesn't use column filters - otherwise, WorkflowSamplesTable would
		// take care of setting the column sortable.
		const coordsColumn = columns.find(col => col.columnID === SampleColumnID.COORDINATES)
		if (coordsColumn) {
			coordsColumn.sorter = true
			coordsColumn.key = SampleColumnID.COORDINATES
			coordsColumn.defaultSortOrder = 'ascend'
			coordsColumn.sortDirections = ['ascend', 'descend', 'ascend']
		}
		return columns
	}, [step, protocol])

	// ** Table filtering and sorting ***

	const handleSetFilter = useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			if (typeof description === 'undefined') {
				return
			}
			dispatch(setFilter(step.id, description, value))
		}, [step, dispatch]
	)

	const handleSetFilterOptions = useCallback(
		(filterKey: string, property: string, value: boolean, description: FilterDescription) => {
			if (typeof description === 'undefined') {
				return
			}
			dispatch(setFilterOptions(step.id, description, { [property]: value }))
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
		}
		, [step, dispatch])
	// Selection handler for sample selection checkboxes
	const onSelectChange = useCallback((selectedSamples) => {
		const displayedSelection = getIdsFromSelectedSamples(selectedSamples)
		const mergedSelection = mergeSelectionChange(stepSamples.selectedSamples, stepSamples.displayedSamples, displayedSelection)
		dispatch(setSelectedSamples(step.id, mergedSelection))
		setIsSorted(false)
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

	const setSelectedSamplesFromRow = useCallback((selectedSamples) => {
		dispatch(setSelectedSamples(step.id, getIdsFromSelectedSamples(selectedSamples)))
		setIsSorted(false)
	}, [step, dispatch])

	// Selection handler for sample selection checkboxes
	const selectionProps = useCallback((onSelectionChangeCallback) => {
		return {
			selectedSampleIDs: stepSamples.selectedSamples,
			clearAllSamples: () => handleClearSelection(),
			onSelectionChanged: onSelectionChangeCallback,
		}
	}, [step, stepSamples])

	/** Sorting by coordinate **/

	const handleCoordinateSortOrientation = useCallback((value: string) => {
		switch (value) {
			case 'row': {
				dispatch(setSelectedSamplesSortDirection(step.id, { ...stepSamples.selectedSamplesSortDirection, orientation: 'row' }))
				break
			}
			case 'column': {
				dispatch(setSelectedSamplesSortDirection(step.id, { ...stepSamples.selectedSamplesSortDirection, orientation: 'column' }))
				break
			}
		}
		setIsSorted(true)
	}, [dispatch, step, stepSamples.selectedSamplesSortDirection])

	const handleSelectionTableSortChange = useCallback((sortBy: SortBy) => {
		if (sortBy.key === SampleColumnID.COORDINATES && sortBy.order) {
			dispatch(setSelectedSamplesSortDirection(step.id, { ...stepSamples.selectedSamplesSortDirection, order: sortBy.order }))
		}
	}, [step.id, stepSamples.selectedSamplesSortDirection, dispatch])

	const localClearFilters = useCallback((refresh: boolean = true) => {
		if (clearFilters)
			dispatch(clearFilters(step.id, refresh))
	}, [step, step.id])

	const updateSortSelectedSamples = useCallback(async () => {
		dispatch(updateSelectedSamplesAtStep(step.id, getIdsFromSelectedSamples(selectedTableSamples)))
	}, [step.id, selectedTableSamples])

	const onTabChange = useCallback((tabKey) => {
		if (tabKey != SAMPLES_TAB_KEY && !isSorted) {
			dispatch(updateSortSelectedSamples)
			setIsSorted(true)
		}
		setSelectedTab(tabKey)
	}, [step.id, selectedTableSamples])


	const onPrefillOpen = useCallback(() => {
		if (!isSorted) {
			dispatch(updateSortSelectedSamples)
			setIsSorted(false)
		}
	}, [step.id, selectedTableSamples, isSorted])

	const placementSave = useCallback((placementData) => {
		const tempPlaceData = {}
		placementData.forEach(container => {
			const samples = container.samples
			if(Object.keys(samples).length > 0){
				Object.keys(samples).forEach(id => {
					if (container.container_name) {
						tempPlaceData[id] = []
						tempPlaceData[id].push({coordinates: samples[id].coordinates, container_barcode: container.container_name, container_kind: '96-well plate'})
					}
				})
			}
		})
		setPlacementData(tempPlaceData)
	}, [])

	/** UX **/

	// Display the number of selected samples in the tab title
	const selectedTabTitle = `Selection (${stepSamples.selectedSamples.length} ${stepSamples.selectedSamples.length === 1 ? "sample" : "samples"} selected)`
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
					<PrefillButton onPrefillOpen={onPrefillOpen} canPrefill={canPrefill ?? false} handlePrefillTemplate={(prefillData: any, placementData: any) => handlePrefillTemplate(prefillData, placementData)} data={selectedTemplate?.prefillFields ?? []} placementData={placementData}></PrefillButton>
					<Button type='default' disabled={!canSubmit} onClick={handleSubmitTemplate} title='Submit a template'>Submit Template</Button>
				</>
			}
			{isAutomationStep &&
				<>
					<ExecuteAutomationButton waitResponse={waitResponse} canExecute={haveSelectedSamples} handleExecuteAutomation={handleExecuteAutomation} step={step} data={stepSamples.selectedSamples} />
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
				<Tabs defaultActiveKey={GROUPED_SAMPLES_TAB_KEY} activeKey={selectedTab} tabBarExtraContent={
					<Space>
						{selectedTab === SELECTION_TAB_KEY &&
							<>
								<Typography.Text>Sort Coordinates: </Typography.Text>
								<Radio.Group
									value={stepSamples.selectedSamplesSortDirection.orientation}
									onChange={(evt) => { evt.target && handleCoordinateSortOrientation(evt.target.value) }}
								>
									<Radio.Button value='row'>by Row</Radio.Button>
									<Radio.Button value='column'>by Column</Radio.Button>
								</Radio.Group>
							</>
						}
						<Popconfirm
							disabled={stepSamples.selectedSamples.length == 0}
							title={'Clear the entire selection?'}
							okText={'Yes'}
							cancelText={'No'}
							placement={'rightTop'}
							onConfirm={() => handleClearSelection()}
						>
							<Button disabled={stepSamples.selectedSamples.length == 0} title='Deselect all samples'>Clear Selection</Button>
						</Popconfirm>
					</Space>
				} onChange={onTabChange}>
					<Tabs.TabPane tab='Samples' key={GROUPED_SAMPLES_TAB_KEY}>
						<LabworkStepOverview
							step={step}
							refreshing={isRefreshing}
							setIsSorted={setIsSorted}
							stepSamples={stepSamples}
							clearFilters={localClearFilters}
							hasFilter={true}
							samples={samples}
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
						{stepSamples.showSelectionChangedWarning &&
							<Alert
								type='warning'
								message='Selection has changed'
								description={`Some samples were removed from the selection because they are no longer at the ${step.name} step.`}
								closable={true}
								showIcon={true}
								onClose={() => dispatch(showSelectionChangedMessage(step.id, false))}
								style={{ marginBottom: '1em' }}
							/>
						}
						{/* Selection table does not allow filtering or sorting.*/}
						{/* Also, we don't handle pagination for selected samples so we are required to 
							load all of the selected samples and libraries for the table to work.
							We should handle pagination and only load pages of samples and libraries on demand.	
						*/}
						<WorkflowSamplesTable
							hasFilter={false}
							samples={selectedTableSamples}
							columns={columnsForSelection}
							selection={selectionProps(setSelectedSamplesFromRow)}
							setSortBy={handleSelectionTableSortChange}
						/>
						<Space><InfoCircleOutlined /><Text italic>Samples are automatically sorted by <Text italic strong>container name</Text> and then by <Text italic strong>coordinate</Text>.</Text></Space>
					</Tabs.TabPane>
					<Tabs.TabPane tab="Placement" key={PLACEMENT_TAB_KEY}>
						<LibraryTransferStep
							stepID={step.id}
							save={placementSave}
							selectedSamples={selectedTableSamples} />
					</Tabs.TabPane>
				</Tabs>
			</PageContent>
		</>
	)
}

export default LabworkStep