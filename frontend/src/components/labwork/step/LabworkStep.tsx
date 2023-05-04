import { InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Popconfirm, Radio, Select, Space, Tabs, Typography } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_PAGINATION_LIMIT } from '../../../config'
import { useAppDispatch } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol, Step } from '../../../models/frontend_models'
import { FilterDescription, FilterValue, SortBy } from '../../../models/paged_items'
import { clearSelectedSamples, flushSamplesAtStep, loadSamplesAtStep, refreshSamplesAtStep, requestPrefilledTemplate, setFilter, setFilterOptions, setSelectedSamplesSortDirection, setSortBy, showSelectionChangedMessage, updateSelectedSamplesAtStep } from '../../../modules/labworkSteps/actions'
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { setPageSize } from '../../../modules/pagination'
import { downloadFromFile } from '../../../utils/download'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import RefreshButton from '../../RefreshButton'
import { getColumnsForStep } from '../../shared/WorkflowSamplesTable/ColumnSets'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS } from '../../shared/WorkflowSamplesTable/LibraryTableColumns'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS } from '../../shared/WorkflowSamplesTable/SampleTableColumns'
import WorkflowSamplesTable, { PaginationParameters } from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { SampleColumnID } from '../../shared/WorkflowSamplesTable/SampleTableColumns'

const { Text } = Typography

interface LabworkStepPageProps {
	protocol: Protocol
	step: Step
	stepSamples: LabworkStepSamples
}

const LabworkStep = ({ protocol, step, stepSamples }: LabworkStepPageProps) => {

	const dispatch = useAppDispatch()
	const navigate = useNavigate()

	// Keep track of the currently selected tab so that we can tweak the UX
	const SAMPLES_TAB_KEY = 'samples'
	const SELECTION_TAB_KEY = 'selection'
	const [selectedTab, setSelectedTab] = useState<string>(SAMPLES_TAB_KEY)

	// ** Refresh **

	const isRefreshing = stepSamples.pagedItems.isFetching
	const handleRefresh = useCallback(
		() => {dispatch(refreshSamplesAtStep(step.id))}	
	, [step, dispatch])

	// ** Template handling **

	// A selected template picker is used if protocol supports more than one template
	const [selectedTemplate, setSelectedTemplate] = useState<LabworkPrefilledTemplateDescriptor>()

	// Set the currently selected template to the first template available, if not already set.
	useEffect(() => {
		if(!selectedTemplate) {
			if (stepSamples.prefill.templates.length > 0) {
				const template = stepSamples.prefill.templates[0]
				setSelectedTemplate(template)
			} else {
				console.error('No templates are associated with step!')
			}
		}
	}, [stepSamples, selectedTemplate])

	// Handle the prefill template button
	const canPrefill = selectedTemplate && stepSamples.selectedSamples.length > 0

	const handlePrefillTemplate = useCallback(
		async () => {
			if (selectedTemplate) {
				try {
					const result = await dispatch(requestPrefilledTemplate(selectedTemplate.id, step.id))
					if (result) {
						downloadFromFile(result.filename, result.data)
					}
				} catch(err) {
					console.error(err)
				}
			}
		}
	, [step, selectedTemplate, dispatch])

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

	/** Table columns **/

	// Memoizing these cuts down on table re-renders. Without it, the samples tables render 6 times
	// when they are initially visible.
	const columnsForSamples = useMemo(() => {
		return getColumnsForStep(step, protocol)
	}, [step, protocol])

	const filterDefinitions = useMemo(() => {
		return {...SAMPLE_COLUMN_FILTERS, ...LIBRARY_COLUMN_FILTERS}
	}, [])

	const filterKeys = useMemo(() => {
		return {...SAMPLE_NEXT_STEP_FILTER_KEYS, ...SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS}
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
			if(typeof description === 'undefined') {
				return
			}
			dispatch(setFilter(step.id, description, value))
		}, [step, dispatch]
	)

	const handleSetFilterOptions = useCallback(
		(filterKey: string, property: string, value: boolean, description: FilterDescription) => {
			if(typeof description === 'undefined') {
				return
			}
			dispatch(setFilterOptions(step.id, description, {[property]: value}))
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

	// Selection handler for sample selection checkboxes
	const selectionProps = {
		selectedSampleIDs: stepSamples.selectedSamples,
		onSelectionChanged: useCallback((selectedSamples) => {
			const displayedSelection = selectedSamples.reduce((acc, selected) => {
				if (selected.sample) {
					acc.push(selected.sample.id)
				}
				return acc
			}, [] as FMSId[])
			const mergedSelection = mergeSelectionChange(stepSamples.selectedSamples, stepSamples.displayedSamples, displayedSelection)
			dispatch(updateSelectedSamplesAtStep(step.id, mergedSelection))
		}, [step, stepSamples, dispatch]),
	}

	const canClearSelection = stepSamples.selectedSamples.length !== 0
	const handleClearSelection = useCallback(
		() => {
			dispatch(clearSelectedSamples(step.id))
		}
	, [step, dispatch])
	
	/** Sorting by coordinate **/

	const handleCoordinateSortOrientation = useCallback((value : string) => {
		switch(value) {
			case 'row': {
				dispatch(setSelectedSamplesSortDirection(step.id, {...stepSamples.selectedSamplesSortDirection, orientation: 'row'}))
				break
			}
			case 'column': {
				dispatch(setSelectedSamplesSortDirection(step.id, {...stepSamples.selectedSamplesSortDirection, orientation: 'column'}))
				break
			}
		}
	}, [dispatch, step, stepSamples.selectedSamplesSortDirection])

	const handleSelectionTableSortChange = useCallback((sortBy: SortBy) => {
		if(sortBy.key === SampleColumnID.COORDINATES && sortBy.order) {
			dispatch(setSelectedSamplesSortDirection(step.id, {...stepSamples.selectedSamplesSortDirection, order: sortBy.order}))
		}
	}, [step.id, stepSamples.selectedSamplesSortDirection, dispatch])

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
					style={{width: '24em'}}
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
			<Button type='primary' disabled={!canPrefill} onClick={handlePrefillTemplate} title='Download a prefilled template with the selected samples'>Prefill Template</Button>
			<Button type='default' disabled={!canSubmit} onClick={handleSubmitTemplate} title='Submit a prefilled template'>Submit Template</Button>
			<RefreshButton 
				refreshing={isRefreshing}
				onRefresh={handleRefresh}
				title='Refresh the list of samples'
			/>
		</Space>
	)

	return (
		<>
			<AppPageHeader title={step.name} extra={buttonBar}/>
			<PageContent loading={stepSamples.pagedItems.isFetching} >
				<Tabs defaultActiveKey={SAMPLES_TAB_KEY} activeKey={selectedTab} tabBarExtraContent={
					<Space>
						{selectedTab === SELECTION_TAB_KEY && 
							<>
							<Typography.Text>Sort Coordinates: </Typography.Text>
							<Radio.Group 
								value={stepSamples.selectedSamplesSortDirection.orientation} 
								onChange={(evt) => {evt.target && handleCoordinateSortOrientation(evt.target.value)}} 
							>
								<Radio.Button value='row'>by Row</Radio.Button>
								<Radio.Button value='column'>by Column</Radio.Button>
							</Radio.Group>
							</>
						}
						<Popconfirm
							title={'Clear the entire selection?'}
							okText={'Yes'}
							cancelText={'No'}
							placement={'rightTop'}
							onConfirm={() => handleClearSelection()}
						>
							<Button disabled={!canClearSelection} title='Deselect all samples'>Clear Selection</Button>
						</Popconfirm>
						
					</Space>
				} onChange={tabKey => setSelectedTab(tabKey)}>
					<Tabs.TabPane tab='Samples' key={SAMPLES_TAB_KEY}>
						<WorkflowSamplesTable 
							sampleIDs={stepSamples.displayedSamples} 
							columns={columnsForSamples}
							filterDefinitions={filterDefinitions}
							filterKeys={filterKeys}
							filters={stepSamples.pagedItems.filters}
							setFilter={handleSetFilter}
							setFilterOptions={handleSetFilterOptions}
							selection={selectionProps}
							setSortBy={handleSetSortBy}
							pagination={pagination}
						/>
					</Tabs.TabPane>
					<Tabs.TabPane tab={selectedTabTitle} key={SELECTION_TAB_KEY}>
						{ stepSamples.showSelectionChangedWarning && 
							<Alert
								type='warning'
								message='Selection has changed'
								description={`Some samples were removed from the selection because they are no longer at the ${step.name} step.`}
								closable={true}
								showIcon={true}
								onClose={() => dispatch(showSelectionChangedMessage(step.id, false))}
								style={{marginBottom: '1em'}}
							/>
						}
						{/* Selection table does not allow filtering or sorting */}
						<WorkflowSamplesTable 
							sampleIDs={stepSamples.selectedSamples}
							columns={columnsForSelection}
							filterDefinitions={{}}
							filterKeys={{}}
							filters={{}}
							setFilter={() => {/*NOOP*/}}
							setFilterOptions={() => {/*NOOP*/}}
							selection={selectionProps}
							setSortBy={handleSelectionTableSortChange}
						/>
						<Space><InfoCircleOutlined/><Text italic>Samples are automatically sorted by container barcode and then by coordinate.</Text></Space>
					</Tabs.TabPane>
				</Tabs>
			</PageContent>
		</>
	)
}

export default LabworkStep