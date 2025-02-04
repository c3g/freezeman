import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { selectSamplesTable } from "../../../selectors";
import { usePagedItemsActionsCallbacks } from "../../pagedItemsTable/usePagedItemsActionCallbacks";
import SamplesTableActions from '../../../modules/samplesTable/actions'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn, ObjectWithSample } from '../../samples/SampleTableColumns'
import { useFilteredColumns } from "../../pagedItemsTable/useFilteredColumns";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../../pagedItemsTable/PagedItemsTable";
import { Project, Sample, Step, Study } from "../../../models/frontend_models";
import { SampleAndLibrary } from "../../WorkflowSamplesTable/ColumnSets";
import { Button, Col, Flex, Popover, Row } from "antd";
import { fetchSamples, fetchWorkflows } from "../../../modules/cache/cache";
import api from "../../../utils/api";
import { FilterSet } from "../../../models/paged_items";
import { FMSProject, FMSSampleNextStepByStudy, FMSStudy, FMSWorkflow } from "../../../models/fms_api_models";
import serializeFilterParamsWithDescriptions from "../../pagedItemsTable/serializeFilterParamsTS";
import { notifySuccess } from "../../../modules/notification/actions";

export function LabworkSamples() {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters } = samplesTableState

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    const SAMPLES_TABLE_COLUMNS: SampleColumn[] = useMemo(() => [
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_CONTAINER,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_COORDINATES,
        // SAMPLE_COLUMN_DEFINITIONS.PROJECT,
    ], [])
    const columns = useFilteredColumns<ObjectWithSample>(
        SAMPLES_TABLE_COLUMNS,
        useMemo(() => SAMPLE_COLUMN_FILTERS, []),
        useMemo(() => SAMPLE_FILTER_KEYS, []),
        filters,
        samplesTableCallbacks.setFilterCallback,
        samplesTableCallbacks.setFilterOptionsCallback
    )

    const [samples, setSamples] = useState<ObjectWithSample[]>([])
    useEffect(() => {
        (async () => {
            setSamples((await fetchSamples(samplesTableState.items)).map(sample => ({ sample: sample as Sample })))
        })()
    }, [samplesTableState.items])

    const mapSampleIDs = useCallback((ids: number[]) => {
        const idsSet = new Set(ids)
        const dataObjectsByID = samples.reduce<DataObjectsByID<ObjectWithSample>>((acc, sample) => {
            if (sample.sample && idsSet.has(sample.sample.id)) {
                acc[sample.sample.id] = sample
            }
            return acc
        }, {} as Record<string, SampleAndLibrary>)
        return Promise.resolve(dataObjectsByID)
    }, [samples])

    const [defaultSelection, setDefaultSelection] = useState(false)
    const [exceptedSampleIDs, setExceptedSampleIDs] = useState<Sample['id'][]>([])
    const sampleSelectionCount = defaultSelection ? samplesTableState.totalCount - exceptedSampleIDs.length : exceptedSampleIDs.length
    const selection: NonNullable<PagedItemsTableProps<SampleAndLibrary>['selection']> = useMemo(() => ({
        onSelectionChanged: (selectedItems, selectAll) => {
            setExceptedSampleIDs(selectedItems.map(id => parseInt(id as string)))
            setDefaultSelection(selectAll)
        }
    }), [])


    return (
        <>
            <AppPageHeader title = "Samples and Libraries"/>
            <PageContent>
                <Row gutter={16}>
                    <Col span={12}>
                        <PagedItemsTable<ObjectWithSample>
                            getDataObjectsByID={mapSampleIDs}
                            pagedItems={samplesTableState}
                            columns={columns}
                            usingFilters={true}
                            initialLoad={false}
                            selection={selection}
                            simplePagination={true}
                            {...samplesTableCallbacks}
                        />
                    </Col>
                    <Col span={12}>
                        <div>{`Samples Selected: ${sampleSelectionCount}`}</div>
                        <LabworkSampleActions defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={filters} />
                    </Col>
                </Row>
            </PageContent>
        </>
    )
}

type ActionType = 'dequeue' | 'queue'

interface ActionInfo {
    type: ActionType
    project: FMSProject
    study: FMSStudy
    workflow: FMSWorkflow['name']
    step: Step['name']
    stepOrder: FMSSampleNextStepByStudy['step_order']
}

interface LabworkSampleActionsProps {
    defaultSelection: boolean
    exceptedSampleIDs: Sample['id'][]
    filters: FilterSet
}
function LabworkSampleActions({ defaultSelection, exceptedSampleIDs, filters }: LabworkSampleActionsProps) {
    const dispatch = useAppDispatch()
    const [actions, setActions] = useState<ActionInfo[]>([])
    const [isFetching, setIsFetching] = useState(false)
    const [sampleIDs, setSampleIDs] = useState<Sample['id'][]>([])
    useEffect(() => {
        (async () => {
            const actions: ActionInfo[] = []

            setIsFetching(true)
            console.info({ defaultSelection, exceptedSampleIDs, filters })
            const sampleIDs = (await dispatch(
                api.samples.sample_ids_by_default_selection_excepted_ids(
                    defaultSelection,
                    exceptedSampleIDs,
                    Object.entries(filters).reduce<Record<string, string>>((acc, [key, filter]) => {
                        acc[key] = filter.value?.toString() ?? ''
                        return acc
                    }, {})
                ))
            ).data
            setSampleIDs(sampleIDs)
            console.info({ sampleIDs })

            if (sampleIDs.length === 0) {
                setActions([])
                setIsFetching(false)
                return
            }

            const sampleNextSteps = (await dispatch(api.sampleNextStep.listSamples(sampleIDs))).data.results
            console.info({ sampleNextSteps })
            type ValueType = [Study['id'], Step['name']]
            const studyStepsBySample = sampleNextSteps.reduce<Record<Sample['id'], ValueType[]>>((acc, sampleNextStep) => {
                acc[sampleNextStep.sample] = acc[sampleNextStep.sample] ?? []
                for (const study of sampleNextStep.studies) {
                    acc[sampleNextStep.sample].push([study, sampleNextStep.step.name])
                }
                return acc
            }, {})

            const studyStepCount: Record<string, number> = {}
            for (const studySteps of Object.values(studyStepsBySample)) {
                for (const [study, stepName] of studySteps) {
                    const key = `${study}-${stepName}`
                    studyStepCount[key] = (studyStepCount[key] ?? 0) + 1
                }
            }
            console.info({ studyStepCount })

            const samples = await fetchSamples(sampleIDs)
            const countByProjectID = samples.reduce<Record<Project['id'], number>>((acc, sample) => {
                if (sample.project) {
                    acc[sample.project] = (acc[sample.project] ?? 0) + 1
                }
                return acc
            }, {})
            const commonProject = Object.entries(countByProjectID).reduce<Project['id'] | null>((acc, [projectID, count]) => {
                if (count === sampleIDs.length) {
                    return parseInt(projectID)
                }
                return acc
            }, null)

            const projectIDs = [...new Set(samples.reduce<Project['id'][]>((acc, sample) => {
                if (sample.project) {
                    acc.push(sample.project)
                }
                return acc
            }, []))]
            const projectByID = (await dispatch(api.projects.list({ id__in: projectIDs.join(',') }))).data.results.reduce<Record<FMSProject['id'], FMSProject>>((acc, project) => {
                acc[project.id] = project
                return acc
            }, {})

            const studyByID = (await dispatch(api.studies.list({ project__id__in: projectIDs.join(',') }))).data.results.reduce<Record<FMSStudy['id'], FMSStudy>>((acc, study) => {
                acc[study.id] = study
                return acc
            }, {})

            const workflowIDs = Object.values(studyByID).reduce<FMSWorkflow['id'][]>((acc, study) => {
                acc.push(study.workflow_id)
                return acc
            }, [])
            const workflowByID = (await fetchWorkflows(workflowIDs)).reduce<Record<FMSWorkflow['id'], FMSWorkflow>>((acc, workflow) => {
                acc[workflow.id] = workflow
                return acc
            }, {})

            const commonStudySteps = Object.entries(studyStepCount).reduce<ValueType[]>((acc, [key, count]) => {
                if (count === sampleIDs.length) {
                    const [study, stepName] = key.split('-')
                    acc.push([parseInt(study), stepName])
                }
                return acc
            }, [])

            actions.push(
                ...commonStudySteps.map(([studyID, stepName]) => {
                    const project = projectByID[studyByID[studyID].project_id]
                    const workflow = workflowByID[studyByID[studyID].workflow_id]
                    const stepOrder = workflow.steps_order.find(stepOrder => stepOrder.step_name === stepName)?.order ?? -1
                    return {
                        type: 'dequeue' as ActionType,
                        project: project,
                        study: studyByID[studyID],
                        workflow: workflow.name,
                        step: stepName,
                        stepOrder: stepOrder,
                    }
                })
            )

            // queue sample actions
            for (const study of Object.values(studyByID)) {
                if (study.project_id === commonProject) {
                    const project = projectByID[study.project_id]
                    const workflow = workflowByID[study.workflow_id]
                    for (const stepOrder of workflow.steps_order) {
                        actions.push({
                            type: 'queue' as ActionType,
                            project: project,
                            study: study,
                            workflow: workflow.name,
                            step: stepOrder.step_name,
                            stepOrder: stepOrder.order,
                        })
                    }
                }
            }

            setActions(actions)
            setIsFetching(false)
        })();
    }, [defaultSelection, exceptedSampleIDs, filters, dispatch])

return <Flex vertical gap={"middle"}>
        {
            isFetching ? "Fetching options..." : actions.map(
                action =>
                    <Popover
                        key={`${action.project}-${action.study}-${action.step}`}
                        content={<>
                            <div>{`Project: ${action.project.name}`}</div>
                            <div>{`Study: ${action.study.letter}`}</div>
                            <div>{`Workflow: ${action.workflow}`}</div>
                            <div>{`Step: ${action.step}`}</div>
                        </>}
                    >
                        <Button onClick={async () => {
                            if (action.stepOrder < 0) return
                            if (action.type === 'queue') {
                                await dispatch(api.samples.addSamplesToStudy(exceptedSampleIDs, defaultSelection, action.project.id, action.study.letter, action.stepOrder, serializeFilterParamsWithDescriptions(filters)))
                                dispatch(notifySuccess({
                                    id: 'NOTIFICATION_ID',
                                    title: "Samples queued to workflow",
                                    description: `Successfully queued samples to study ${action.study.letter} at step "${action.step} for project ${action.project.name}"`
                                }))
                            } else if (action.type === 'dequeue') {
                                await dispatch(api.sampleNextStepByStudy.removeList(sampleIDs, action.study.id, action.stepOrder))
                                dispatch(notifySuccess({
                                    id: 'NOTIFICATION_ID',
                                    title: "Samples dequeued from workflow",
                                    description: `Successfully dequeued samples from study ${action.study.letter} at step "${action.step} for project ${action.project.name}"`
                                }))
                            }
                        }} type="primary">{`${action.type === 'queue' ? 'Queue to' : 'Dequeue from'} Study ${action.study.letter} - ${action.step}`}</Button>
                    </Popover>
            )
        }
    </Flex>
}