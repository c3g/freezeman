import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId, FMSSampleNextStep, FMSSampleNextStepByStudy } from '../../models/fms_api_models'
import { Protocol, Sample } from '../../models/frontend_models'
import { clearFilters, refreshStudySamples, setStudyStepFilter, setStudyStepFilterOptions, setStudyStepSortOrder } from '../../modules/studySamples/actions'
import { StudySampleStep, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { SampleAndLibrary, getColumnsForStudySamplesStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS } from '../shared/WorkflowSamplesTable/LibraryTableColumns'
import { IdentifiedTableColumnType, SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import WorkflowSamplesTable from '../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterValue, SortBy } from '../../models/paged_items'
import { Spin, notification } from 'antd'
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
	
	const [sampleNextStepIDs, setSampleNextSteps] = useState<FMSSampleNextStep['id'][]>()
	useEffect(() => {
		(async () => {
			const results = (await dispatch(api.sampleNextStep.list({
				sample__id__in: step.samples.join(","),
				studies__id: studyID,
				step__id: step.stepID
			}))).data.results as FMSSampleNextStep[]
			// console.debug(results)
			setSampleNextSteps(results.map(sns => sns.id))
		})()
	}, [dispatch, step.samples, step.stepID, studyID])

	const [sampleNextStepByStudies, setSampleNextStepByStudies] = useState<{[key: Sample['id']]: FMSSampleNextStepByStudy['id']}>()
	useEffect(() => {
		(async () => {
			if (sampleNextStepIDs) {
				const results = (await dispatch(api.sampleNextStepByStudy.list({
					sample_next_step__id__in: sampleNextStepIDs.join(","),
					study__id: studyID,
					step_order__id: step.stepOrderID
				}))).data.results as FMSSampleNextStepByStudy[]
				// console.debug(results)
				setSampleNextStepByStudies(Object.fromEntries(results.map((snsbs) => [snsbs.sample, snsbs.id])))
			}
		})()
	}, [dispatch, sampleNextStepIDs, step.stepOrderID, studyID])

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
						return <Spin spinning={!sampleNextStepByStudies}>{
							sample && sampleNextStepByStudies && sample.id in sampleNextStepByStudies ? (
								<a onClick={async () => {
									const REMOVE_NOTIFICAITON_KEY = `StudyStepSamplesTable.remove-${studyID}-${step.stepID}-${sample?.name}`
									notification.info({
										message: `Removing sample '${sample?.name}' from step '${step.stepName}'`,
										key: REMOVE_NOTIFICAITON_KEY
									})
									await dispatch(api.sampleNextStepByStudy.remove(sampleNextStepByStudies[sample.id]))
									await dispatch(refreshStudySamples(studyID))
									notification.close(REMOVE_NOTIFICAITON_KEY)
								}}>Remove</a>
							) : <span>Remove</span>
						}</Spin>
					}
				}
			]
		} else {
			return []
		}
	}, [dispatch, protocol, sampleNextStepByStudies, stepDefinition, studyID])

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

