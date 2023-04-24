import React, { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { Protocol } from '../../models/frontend_models'
import { setStudyStepFilter, setStudyStepFilterOptions, setStudyStepSortOrder } from '../../modules/studySamples/actions'
import { StudySampleStep, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { SampleAndLibrary, getColumnsForStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS } from '../shared/WorkflowSamplesTable/LibraryTableColumns'
import { IdentifiedTableColumnType, SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS, SampleColumnID } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import WorkflowSamplesTable from '../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterValue, SortBy } from '../../models/paged_items'

interface StudyStepSamplesTableProps {
	studyID: FMSId
	step: StudySampleStep
	settings?: StudyUXStepSettings
}

function StudyStepSamplesTable({studyID, step, settings} : StudyStepSamplesTableProps) {

	const dispatch = useAppDispatch()
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)
	

	const setFilter = useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			dispatch(setStudyStepFilter(studyID, step.stepID, description, value))
		}
	, [studyID, step, dispatch])

	const setFilterOptions = useCallback(
		(filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => {
			dispatch(setStudyStepFilterOptions(studyID, step.stepID, description, {[propertyName]: value}))
		}
	, [dispatch, studyID, step])

	const setSortBy = useCallback(
		(sortBy: SortBy) => {
			dispatch(setStudyStepSortOrder(studyID, step.stepID, sortBy))
		}
	, [studyID, step, dispatch])

	const protocol : Protocol | undefined = protocolsByID[step.protocolID]
	const stepDefinition = stepsByID[step.stepID]

	const columns: IdentifiedTableColumnType<SampleAndLibrary>[] = useMemo(() => {
		if (protocol && stepDefinition) {
			// Same columns as labwork, but we don't want the Project column, since the user
			// is already in the project details page.
			return getColumnsForStep(stepDefinition, protocol).filter(col => col.columnID !== SampleColumnID.PROJECT)
		} else {
			return []
		}
	}, [protocol, stepDefinition])
	
	return (
		<WorkflowSamplesTable
			hasFilter={true}
			stepNumber={step.stepID}
			sampleIDs={step.samples ?? []}
			columns={columns}
			filterDefinitions={{...SAMPLE_COLUMN_FILTERS, ...LIBRARY_COLUMN_FILTERS}}
			filterKeys={{...SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS, ...SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS}}
			filters={settings?.filters ?? {}}
			setFilter={setFilter}
			setFilterOptions={setFilterOptions}
			setSortBy={setSortBy}
		/>
	)
}

export default StudyStepSamplesTable

