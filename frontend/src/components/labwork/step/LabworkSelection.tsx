import { InfoCircleOutlined } from "@ant-design/icons"
import { Alert, Space, Typography } from "antd"
import React, { useState, useCallback, useEffect, useMemo } from "react"
import { DEFAULT_SMALL_PAGE_SIZE } from "../../../constants"
import { useAppDispatch, useSampleAndLibraryList } from "../../../hooks"
import { Protocol, Step } from "../../../models/frontend_models"
import { updateSelectedSamplesAtStep, showSelectionChangedMessage, setSelectedSamples, unselectSamples } from "../../../modules/labworkSteps/actions"
import { LabworkStepSamples } from "../../../modules/labworkSteps/models"
import { SampleAndLibrary, getColumnsForStep } from "../../WorkflowSamplesTable/ColumnSets"
import WorkflowSamplesTable, { WorkflowSamplesTableProps } from "../../WorkflowSamplesTable/WorkflowSamplesTable"
import { SampleColumnID } from "../../samples/SampleTableColumns"
import { FMSId } from "../../../models/fms_api_models"

const { Text } = Typography

export interface LabworkSelectionProps {
	stepSamples: LabworkStepSamples
	step: Step
	protocol: Protocol | undefined
	setSortByList: WorkflowSamplesTableProps['setSortByList']
}

function samplesAndLibrariesToSampleIDs(sampleAndLibraries: SampleAndLibrary[]) {
	return sampleAndLibraries.reduce((sampleIDs, sampleAndLibrary) => {
		if (sampleAndLibrary.sample) {
			sampleIDs.push(sampleAndLibrary.sample.id)
		}
		return sampleIDs
	}, [] as FMSId[])
}

export function LabworkSelection({stepSamples, step, protocol, setSortByList}: LabworkSelectionProps) {
	const dispatch = useAppDispatch()

	const [pageSize, setPageSize] = useState(DEFAULT_SMALL_PAGE_SIZE)
	const [pageNumber, setPageNumber] = useState(1)
	const totalCount = stepSamples.selectedSamples.items.length

	const [samples, loading] = useSampleAndLibraryList(stepSamples.selectedSamples.items, pageSize * (pageNumber - 1), pageSize)

	const onChangePageNumber = useCallback((pageNumber: number) => { setPageNumber(pageNumber) }, [])
	const onChangePageSize = useCallback((pageSize: number) => { setPageSize(pageSize) }, [])

	useEffect(() => {
		// order checked automatically
		dispatch(updateSelectedSamplesAtStep(step.id, stepSamples.selectedSamples.items))
	}, [dispatch, step.id, stepSamples.selectedSamples.items])

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

	const selection: WorkflowSamplesTableProps['selection'] = useMemo(() => ({
		selectedSampleIDs: stepSamples.selectedSamples.items,
		onSelectionChanged(selectedSamples) {
			const selectedSamplesInPage = samplesAndLibrariesToSampleIDs(selectedSamples)
			const unselectedSamples = samplesAndLibrariesToSampleIDs(samples).filter((id) => !selectedSamplesInPage.includes(id))
			dispatch(unselectSamples(step.id, unselectedSamples))
		}
	}), [dispatch, samples, step.id, stepSamples.selectedSamples.items])

	return <>
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
		*/}
		<WorkflowSamplesTable
			hasFilter={false}
			samples={samples}
			columns={columnsForSelection}
			selection={selection}
			sortByList={[]}
			setSortByList={setSortByList}
			pagination={{ pageNumber, pageSize, onChangePageNumber, onChangePageSize, totalCount }}
			loading={loading}
		/>
		<Space><InfoCircleOutlined /><Text italic>Samples are automatically sorted by <Text italic strong>container name</Text> and then by <Text italic strong>coordinate</Text>.</Text></Space>

	</>
}

export default LabworkSelection