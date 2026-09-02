import React, { useCallback, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { Protocol, Sample } from '../../models/frontend_models'
import { clearFilters, refreshStudySamples, setStudyStepFilter, setStudyStepFilterOptions, setStudyStepPageNumber, setStudyStepPageSize, setStudyStepSortOrder } from '../../modules/studySamples/actions'
import { StudySampleStep, StudyStepSamplesTableState, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { SampleAndLibraryAndIdentity, getColumnsForStudySamplesStep } from '../WorkflowSamplesTable/ColumnSets'
import { LIBRARY_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_LIBRARY_FILTER_KEYS } from '../libraries/LibraryTableColumns'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_BY_STUDY_FILTER_KEYS } from '../samples/SampleTableColumns'
import WorkflowSamplesTable from '../WorkflowSamplesTable/WorkflowSamplesTable'
import { FilterDescription, FilterValue, SortBy } from '../../models/paged_items'
import { Popconfirm, Button, notification, Dropdown } from 'antd'
import api from '../../utils/api'
import { IdentifiedTableColumnType } from '../pagedItemsTable/PagedItemsColumns'
import { DEFAULT_SMALL_PAGINATION_LIMIT } from '../../config'
import { MenuProps } from 'antd/lib/menu'
import { FastForwardOutlined, StopOutlined } from '@ant-design/icons'

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
        width: 150,
        render: (_: any, { sample }: SampleAndLibraryAndIdentity) => {
            return sample && <ActionButton sample={sample} step={step} studyID={studyID} />
        }
    }), [dispatch, step.mandatory, step.ready.sampleNextStepByID, step.stepID, step.stepName, step.stepOrder, studyID])

    const columns: IdentifiedTableColumnType<SampleAndLibraryAndIdentity>[] = useMemo(() => {
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

interface ActionButtonProps {
    sample: Sample
    step: StudySampleStep
    studyID: FMSId
}
export function ActionButton({ sample, step, studyID }: ActionButtonProps) {
    const dispatch = useAppDispatch()
    const DEFAULT_LABEL = "Select Action"
    const [buttonLabel, setButtonLabel] = useState<string>(DEFAULT_LABEL)

    return <Dropdown menu={{
        items: [
            {
                label: "Remove",
                key: "Remove",
                icon: <StopOutlined />,
                disabled: !sample
            },
            {
                label: "Skip",
                key: "Skip",
                icon: <FastForwardOutlined />,
                disabled: !sample || step.mandatory
            }
        ],
        onClick: async (info) => {
            if (!sample) return;
            if (info.key === "Remove") {
                try {
                    const REMOVE_NOTIFICATION_KEY = `StudyStepSamplesTable.remove-${studyID}-${step.stepID}-${sample.id}`
                    notification.info({
                        message: `Removing sample '${sample?.name}' from step '${step.stepName}'`,
                        key: REMOVE_NOTIFICATION_KEY
                    })
                    setButtonLabel("Removing...")
                    await dispatch(api.sampleNextStepByStudy.remove(step.ready.sampleNextStepByID[sample.id]))
                    await dispatch(refreshStudySamples(studyID))
                    notification.destroy(REMOVE_NOTIFICATION_KEY)
                } finally {
                    setButtonLabel(DEFAULT_LABEL)
                }
            } else if (info.key === "Skip") {
                const SKIPPING_KEY = `StudyStepSamplesTable.skip-${studyID}-${step.stepID}-${sample.id}`
                notification.info({
                    message: `Skipping step '${step.stepName}' for sample '${sample?.name}'`,
                    key: SKIPPING_KEY
                })
                try {
                    setButtonLabel("Skipping...")
                    await dispatch(api.sampleNextStepByStudy.skip([sample.id], studyID, step.stepOrder))
                    await dispatch(refreshStudySamples(studyID))
                } catch (e) {
                    const ERROR_KEY = `StudyStepSamplesTable.skip_error-${studyID}-${step.stepID}-${sample.id}`
                    notification.error({
                        message: e.data,
                        key: ERROR_KEY
                    })
                } finally {
                    setButtonLabel(DEFAULT_LABEL)
                    notification.destroy(SKIPPING_KEY)
                }
            }
        }
    }}>
        <Button>
            {buttonLabel}
        </Button>
    </Dropdown>
}

export default StudyStepSamplesTable