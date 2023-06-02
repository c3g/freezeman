import React, { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { Protocol } from '../../models/frontend_models'
import { clearFilters, refreshStudySamples, setStudyStepFilter, setStudyStepFilterOptions, setStudyStepSortOrder } from '../../modules/studySamples/actions'
import { StudySampleStep, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { SampleAndLibrary, getColumnsForStudySamplesStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS } from '../shared/WorkflowSamplesTable/LibraryTableColumns'
import { IdentifiedTableColumnType, SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import WorkflowSamplesTable from '../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterValue, SortBy } from '../../models/paged_items'
import { Popconfirm, Typography, notification } from 'antd'
import api from '../../utils/api'

interface StudyStepSamplesTableProps {
	studyID: FMSId
	step: StudySampleStep
	settings?: StudyUXStepSettings
}

function StudyStepSamplesTable({ studyID, step, settings }: StudyStepSamplesTableProps) {

	const dispatch = useAppDispatch()
	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)

	const setFilter = useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			dispatch(setStudyStepFilter(studyID, step.stepOrderID, description, value))
		}
		, [studyID, step, dispatch])

	const setFilterOptions = useCallback(
		(filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => {
			dispatch(setStudyStepFilterOptions(studyID, step.stepOrderID, description, {[propertyName]: value}))
		}
		, [dispatch, studyID, step])

	const setSortBy = useCallback(
		(sortBy: SortBy) => {
			dispatch(setStudyStepSortOrder(studyID, step.stepOrderID, sortBy))
		}
		, [studyID, step, dispatch])

	const protocol: Protocol | undefined = protocolsByID[step.protocolID]
	const stepDefinition = stepsByID[step.stepID]

	const columns: IdentifiedTableColumnType<SampleAndLibrary>[] = useMemo(() => {
		if (protocol && stepDefinition) {
			// Same columns as labwork, but we don't want the Project column, since the user
			// is already in the project details page.
			return [
				...getColumnsForStudySamplesStep(stepDefinition, protocol),
				{
					columnID: 'Action',
					title: 'Action',
					dataIndex: ['sample', 'id'],
					render: (_, { sample }) => {
						return <Popconfirm
							title={`Are you sure you want to remove sample '${sample?.name ?? 'Loading...'}' from step '${step.stepName}'?`}
							onConfirm={async () => {
								if (!sample) return;
								const REMOVE_NOTIFICATION_KEY = `StudyStepSamplesTable.remove-${studyID}-${step.stepID}-${sample.id}`
								notification.info({
									message: `Removing sample '${sample?.name}' from step '${step.stepName}'`,
									key: REMOVE_NOTIFICATION_KEY
								})
								await dispatch(api.sampleNextStepByStudy.remove(step.sampleNextStepByStudyBySampleID[sample.id].id))
								await dispatch(refreshStudySamples(studyID))
								notification.close(REMOVE_NOTIFICATION_KEY)
							}}
							disabled={!sample}
							placement={'topLeft'}
						>
							<Typography.Link underline type={'danger'} href={''}>Remove</Typography.Link>
						</Popconfirm>
					}
				}
			]
		} else {
			return []
		}
	}, [dispatch, protocol, step.sampleNextStepByStudyBySampleID, step.stepID, step.stepName, stepDefinition, studyID])

	const localClearFilters = () => {
		if (clearFilters)
			dispatch(clearFilters(studyID, step.stepID))
	}

	return (
		<WorkflowSamplesTable
			clearFilters={localClearFilters}
			hasFilter={true}
			sampleIDs={step.samples ?? []}
			columns={columns}
			filterDefinitions={{ ...SAMPLE_COLUMN_FILTERS, ...LIBRARY_COLUMN_FILTERS }}
			filterKeys={{ ...SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS, ...SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS }}
			filters={settings?.filters ?? {}}
			setFilter={setFilter}
			setFilterOptions={setFilterOptions}
			setSortBy={setSortBy}
		/>
	)
}

export default StudyStepSamplesTable

