import React, { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { Protocol } from '../../models/frontend_models'
import { clearFilters, refreshStudySamples, setStudyStepFilter, setStudyStepFilterOptions, setStudyStepPageNumber, setStudyStepPageSize, setStudyStepSortOrder } from '../../modules/studySamples/actions'
import { StudySampleStep, StudyStepSamplesTableState, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { SampleAndLibrary, getColumnsForStudySamplesStep } from '../WorkflowSamplesTable/ColumnSets'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS } from '../libraries/LibraryTableColumns'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS } from '../samples/SampleTableColumns'
import WorkflowSamplesTable from '../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterValue, SortBy } from '../../models/paged_items'
import { Popconfirm, Button, notification } from 'antd'
import api from '../../utils/api'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { DEFAULT_SMALL_PAGINATION_LIMIT } from '../../config'

interface StudyStepSamplesTableProps {
  studyID: FMSId
  step: StudySampleStep
  tableState?: StudyStepSamplesTableState
  settings?: StudyUXStepSettings
}

function StudyStepSamplesTable({ studyID, step, tableState, settings }: StudyStepSamplesTableProps) {

  const dispatch = useAppDispatch()
  const protocolsByID = useAppSelector(selectProtocolsByID)
  const stepsByID = useAppSelector(selectStepsByID)

  const pageSize = settings?.pageSize ?? DEFAULT_SMALL_PAGINATION_LIMIT
  const pageNumber = tableState?.pageNumber ?? 1

  const onChangePageNumber = useCallback((pageNumber: number) => { dispatch(setStudyStepPageNumber(studyID, step.stepOrderID, 'ready', pageNumber)) }, [dispatch, studyID, step.stepOrderID])
  const onChangePageSize = useCallback((pageSize: number) => { dispatch(setStudyStepPageSize(studyID, step.stepOrderID, pageSize)) }, [dispatch, studyID, step.stepOrderID])

  const setFilter = useCallback(
    (filterKey: string, value: FilterValue, description: FilterDescription) => {
      dispatch(setStudyStepFilter(studyID, step.stepOrderID, description, value))
    }
    , [studyID, step, dispatch])

  const setFilterOptions = useCallback(
    (filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => {
      dispatch(setStudyStepFilterOptions(studyID, step.stepOrderID, description, { [propertyName]: value }))
    }
    , [dispatch, studyID, step])

  const setSortBy = useCallback(
    (sortBy: SortBy) => {
      dispatch(setStudyStepSortOrder(studyID, step.stepOrderID, sortBy))
    }
    , [studyID, step, dispatch])

  const protocol: Protocol | undefined = protocolsByID[step.protocolID]
  const stepDefinition = stepsByID[step.stepID]

  const actionColumn = useMemo(() => ({
    columnID: 'Action',
    title: 'Action',
    dataIndex: ['sample', 'id'],
    width: 100,
    render: (_: any, { sample }: SampleAndLibrary) => {
      return <Popconfirm
        title={`Are you sure you want to remove sample '${sample?.name ?? 'Loading...'}' from step '${step.stepName}'?`}
        onConfirm={async () => {
          if (!sample) return;
          const REMOVE_NOTIFICATION_KEY = `StudyStepSamplesTable.remove-${studyID}-${step.stepID}-${sample.id}`
          notification.info({
            message: `Removing sample '${sample?.name}' from step '${step.stepName}'`,
            key: REMOVE_NOTIFICATION_KEY
          })
          await dispatch(api.sampleNextStepByStudy.remove(step.ready.sampleNextStepByID[sample.id]))
          await dispatch(refreshStudySamples(studyID))
          notification.close(REMOVE_NOTIFICATION_KEY)
        }}
        disabled={!sample}
        placement={'topLeft'}
      >
        <Button color="danger" variant="link">Remove</Button>
      </Popconfirm>
    }
  }), [dispatch, step.ready.sampleNextStepByID, step.stepID, step.stepName, studyID])

  const columns: IdentifiedTableColumnType<SampleAndLibrary>[] = useMemo(() => {
    if (stepDefinition) { // missing protocol leads to default columns
      // Same columns as labwork, but we don't want the Project column, since the user
      // is already in the project details page.
      return [
        ...getColumnsForStudySamplesStep(stepDefinition, protocol),
        actionColumn,
      ]
    } else {
      return []
    }
  }, [actionColumn, protocol, stepDefinition])

  const localClearFilters = useCallback(() => {
    if (clearFilters)
      dispatch(clearFilters(studyID, step.stepOrderID))
  }, [dispatch, step.stepOrderID, studyID])

  return (
    <WorkflowSamplesTable
      clearFilters={localClearFilters}
      hasFilter={true}
      samples={step.ready.samples}
      columns={columns}
      filterDefinitions={{ ...SAMPLE_COLUMN_FILTERS, ...LIBRARY_COLUMN_FILTERS }}
      filterKeys={{ ...SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS, ...SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS }}
      filters={settings?.filters ?? {}}
      setFilter={setFilter}
      setFilterOptions={setFilterOptions}
      setSortBy={setSortBy}
      pagination={{ pageNumber, pageSize, totalCount: step.ready.count, onChangePageNumber, onChangePageSize }}
      loading={tableState?.isFetching ?? true}
    />
  )
}

export default StudyStepSamplesTable