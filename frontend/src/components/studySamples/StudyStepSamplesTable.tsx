import React, { useEffect, useCallback, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Protocol } from '../../models/frontend_models'
import { StudySampleStep } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID, selectLabworkStepsState } from '../../selectors'
import { getColumnsForStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS, SampleColumnID } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import WorkflowSamplesTable from '../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS } from '../shared/WorkflowSamplesTable/LibraryTableColumns'
import { LabworkStepSamples } from '../../modules/labworkSteps/models'
import { initSamplesAtStep, loadSamplesAtStep, refreshSamplesAtStep, setFilter, setFilterOptions, setSortBy } from '../../modules/labworkSteps/actions'
import { FilterDescription, FilterValue, SortBy } from '../../models/paged_items'
import { setPageSize } from '../../modules/pagination'
import { DEFAULT_PAGINATION_LIMIT } from '../../config'

interface PaginationParameters {
	pageNumber: number
	pageSize: number
	totalCount: number
	onChangePageNumber: (pageNumber: number) => void
	onChangePageSize: (newPageSize: number) => void
}

interface StudyStepSamplesTableProps {
	step: StudySampleStep
}


function StudyStepSamplesTable({ step }: StudyStepSamplesTableProps) {
	const dispatch = useAppDispatch()
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)
	const labworkStepsState = useAppSelector(selectLabworkStepsState)
	const [labworkStepSamples, setLabworkStepSamples] = useState<LabworkStepSamples>()

	useEffect(() => {
		// if(step && protocol) {
		const foundLabwork = labworkStepsState.steps[step.stepID]
		if (foundLabwork) {
			setLabworkStepSamples(foundLabwork)
		} else {
			dispatch(initSamplesAtStep(step.stepID))
		}
	}, [labworkStepsState])

	// useEffect(()=>{

	// },[])

	const filterDefinitions = useMemo(() => {
		return { ...SAMPLE_COLUMN_FILTERS, ...LIBRARY_COLUMN_FILTERS }
	}, [])

	const filterKeys = useMemo(() => {
		return { ...SAMPLE_NEXT_STEP_FILTER_KEYS, ...SAMPLE_NEXT_STEP_LIBRARY_FILTER_KEYS }
	}, [])

	const handleSetFilter = useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			if (typeof description === 'undefined') {
				return
			}
			dispatch(setFilter(step.stepID, description, value))
		}, [step, dispatch]
	)
	const handleSetFilterOptions = useCallback(
		(filterKey: string, property: string, value: boolean, description: FilterDescription) => {
			if (typeof description === 'undefined') {
				return
			}
			dispatch(setFilterOptions(step.stepID, description, { [property]: value }))
		}
		, [step, dispatch])
	const handleSetSortBy = useCallback(
		(sortBy: SortBy) => {
			dispatch(setSortBy(step.stepID, sortBy))
		}
		, [step, dispatch])

	const handlePageNumber = useCallback(
		(pageNumber: number) => {
			dispatch(loadSamplesAtStep(step.stepID, pageNumber))
		}
		, [step, dispatch])

	const handlePageSize = useCallback(
		(pageSize: number) => {
			dispatch(setPageSize(pageSize))
			dispatch(loadSamplesAtStep(step.stepID, labworkStepSamples ? labworkStepSamples.pagedItems.page?.pageNumber ?? 1: 1))
		}
		, [labworkStepSamples, dispatch])

	const pagination: PaginationParameters = {
		pageNumber: labworkStepSamples ? labworkStepSamples.pagedItems.page?.pageNumber ?? 1 : 1,
		totalCount: labworkStepSamples ? labworkStepSamples.pagedItems.totalCount ?? 1 : 1,
		pageSize: labworkStepSamples ? labworkStepSamples.pagedItems.page?.limit ?? DEFAULT_PAGINATION_LIMIT : DEFAULT_PAGINATION_LIMIT,
		onChangePageNumber: handlePageNumber,
		onChangePageSize: handlePageSize
	}
	const protocol: Protocol | undefined = protocolsByID[step.protocolID]
	if (!protocol) {
		return null
	}
	const stepDefinition = stepsByID[step.stepID]
	if (!stepDefinition) {
		return null
	}

	// Same columns as labwork, but we don't want the Project column, since the user
	// is already in the project details page.
	const columns = getColumnsForStep(stepDefinition, protocol).filter(col => col.columnID !== SampleColumnID.PROJECT)

	return (
		<WorkflowSamplesTable
			hasFilter={true}
			stepNumber={step.stepID}
			sampleIDs={step.samples ?? []}
			columns={columns}
			filterDefinitions={filterDefinitions}
			filterKeys={filterKeys}
			filters={labworkStepSamples ? labworkStepSamples.pagedItems.filters : {}}
			setFilter={handleSetFilter}
			setFilterOptions={handleSetFilterOptions}
			setSortBy={handleSetSortBy}
			pagination={pagination}
		/>
	)
}

export default StudyStepSamplesTable

