import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { selectProjectsByID, selectSamplesByID, selectSamplesTable } from "../../../selectors";
import { usePagedItemsActionsCallbacks } from "../../pagedItemsTable/usePagedItemsActionCallbacks";
import SamplesTableActions from '../../../modules/samplesTable/actions'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn, ObjectWithSample } from '../../samples/SampleTableColumns'
import { useFilteredColumns } from "../../pagedItemsTable/useFilteredColumns";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../../pagedItemsTable/PagedItemsTable";
import { Project, Sample, Step, Study, Workflow } from "../../../models/frontend_models";
import { SampleAndLibrary } from "../../WorkflowSamplesTable/ColumnSets";
import { Button, Col, Divider, Flex, Popover, Row, Select, Spin } from "antd";
import { fetchSamples, fetchWorkflows } from "../../../modules/cache/cache";
import api from "../../../utils/api";
import { FilterSet } from "../../../models/paged_items";
import { FMSSampleNextStepByStudy, FMSStudy, FMSWorkflow } from "../../../models/fms_api_models";
import serializeFilterParamsWithDescriptions from "../../pagedItemsTable/serializeFilterParamsTS";
import { notifyError, notifySuccess } from "../../../modules/notification/actions";

export function LabworkSamples() {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters } = samplesTableState

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    const SAMPLES_TABLE_COLUMNS: SampleColumn[] = useMemo(() => [
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_CONTAINER,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_COORDINATES,
        SAMPLE_COLUMN_DEFINITIONS.PROJECT,
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
                    <Col span={18}>
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
                        <div>{`Samples Selected: ${sampleSelectionCount}`}</div>
                    </Col>
                    <Col span={6}>
                        <LabworkSampleActions defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={filters} />
                    </Col>
                </Row>
            </PageContent>
        </>
    )
}

interface ActionInfo {
    study: FMSStudy
    workflow: FMSWorkflow['name']
    step: Step['name']
    stepOrder: FMSSampleNextStepByStudy['step_order'],
    alreadyQueued: Sample['id'][]
}

interface LabworkSampleActionsProps {
    defaultSelection: boolean
    exceptedSampleIDs: Sample['id'][]
    filters: FilterSet
}
function LabworkSampleActions({ defaultSelection, exceptedSampleIDs, filters }: LabworkSampleActionsProps) {
    const dispatch = useAppDispatch()
    const projectByID = useAppSelector(selectProjectsByID)
    const sampleByID = useAppSelector(selectSamplesByID)

    const [isFetching, setIsFetching] = useState(false)
    const [sampleIDs, setSampleIDs] = useState<Array<Sample['id']>>([])
    
    const [dequeueActions, setDequeueActions] = useState<ActionInfo[]>([])
    const [queueActions, setQueueActions] = useState<ActionInfo[]>([])
    
    const [studyWorkflows, setStudyWorkflows] = useState<Record<Project['id'], { study: Study['letter'], workflow: Workflow['name']}>>([])
    const [commonProjects, setCommonProjects] = useState<Array<{ id: Project['id'], name: Project['name'] }>>([])

    useEffect(() => {
        // console.info({ defaultSelection, exceptedSampleIDs, filters })
        dispatch(api.samples.sample_ids_by_default_selection_excepted_ids(
            defaultSelection,
            exceptedSampleIDs,
            Object.entries(filters).reduce<Record<string, string>>((acc, [key, filter]) => {
                acc[key] = filter.value?.toString() ?? ''
                return acc
            }, {})
        )).then(response => {
            const sampleIDs = response.data
            setSampleIDs(sampleIDs)
            // console.info({ sampleIDs })
        })
    }, [defaultSelection, dispatch, exceptedSampleIDs, filters])

    const refreshActions = useCallback(async () => {
        if (sampleIDs.length === 0) {
            setQueueActions([])
            setDequeueActions([])
            setStudyWorkflows([])
            setIsFetching(false)
            return
        }
        setIsFetching(true)

        const nonPooledSamples = (await fetchSamples(sampleIDs))
        const pooledSamples = (await dispatch(api.pooledSamples.list({ sample__id__in: sampleIDs.join(',') }))).data.results
        const projectsBySample = [...nonPooledSamples, ...pooledSamples].reduce<Record<Sample['id'], Set<Project['id']>>>((acc, sample) => {
            if ('pool_id' in sample) {
                // handle pooled samples
                if (!acc[sample.pool_id]) {
                    acc[sample.pool_id] = new Set()
                }
                acc[sample.pool_id].add(sample.project_id)
            } else {
                // handle non-pooled samples
                if (!acc[sample.id]) {
                    acc[sample.id] = new Set()
                }
                if (sample.project) {
                    acc[sample.id].add(sample.project)
                }
            }
            return acc
        }, {})

        type StudyStepKey = `${Study['id']}-${Step['name']}`
        const sampleNextSteps = (await dispatch(api.sampleNextStep.listSamples(sampleIDs))).data.results
        console.info({ sampleNextSteps })
        const studyStepCount: Record<string, number> = {}
        const sampleIDsByStudyStep: Record<StudyStepKey, Set<Sample['id']>> = {}
        for (const sampleNextStep of sampleNextSteps) {
            for (const study of sampleNextStep.studies) {
                const key = `${study}-${sampleNextStep.step.name}` as const

                studyStepCount[key] = (studyStepCount[key] ?? 0) + 1

                if (!sampleIDsByStudyStep[key]) {
                    sampleIDsByStudyStep[key] = new Set()
                }
                sampleIDsByStudyStep[key].add(sampleNextStep.sample)
            }
        }
        // console.info({ studyStepCount })
        type StudyStepPair = [Study['id'], Step['name']]
        const commonStudySteps = Object.entries(studyStepCount).reduce<StudyStepPair[]>((acc, [key, count]) => {
            if (count === sampleIDs.length) {
                const [study, stepName] = key.split('-')
                acc.push([parseInt(study), stepName])
            }
            return acc
        }, [])

        const countByProjectID = Object.values(projectsBySample).reduce<Record<Project['id'], number>>((acc, projects) => {
            for (const project of projects) {
                acc[project] = (acc[project] ?? 0) + 1
            }
            return acc
        }, {})
        const commonProjects = Object.entries(countByProjectID).reduce<Project['id'][]>((acc, [projectID, count]) => {
            if (count === sampleIDs.length) {
                acc.push(parseInt(projectID))
            }
            return acc
        }, [])
        setCommonProjects(commonProjects)

        const projectIDs = [...new Set(Object.values(projectsBySample).reduce<Project['id'][]>((acc, projects) => {
            acc.push(...projects)
            return acc
        }, []))]
        const studyByID = projectIDs.length === 0 ? [] : (await dispatch(api.studies.list({ project__id__in: projectIDs.join(',') }))).data.results.reduce<Record<FMSStudy['id'], FMSStudy>>((acc, study) => {
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

        setDequeueActions(
            commonStudySteps.reduce<ActionInfo[]>((dequeueActions, [studyID, stepName]) => {
                const workflow = workflowByID[studyByID[studyID].workflow_id]
                const stepOrder = workflow.steps_order.find(stepOrder => stepOrder.step_name === stepName)?.order
                if (stepOrder === undefined) return dequeueActions
                dequeueActions.push({
                    study: studyByID[studyID],
                    workflow: workflow.name,
                    step: stepName,
                    stepOrder: stepOrder,
                    alreadyQueued: [],
                })
                return dequeueActions
            }, [])
        )

        const studyWorkflows: [Study['letter'], Workflow['name']][] = []

        setQueueActions(Object.values(studyByID).reduce<ActionInfo[]>((queueActions, study) => {
            const workflow = workflowByID[study.workflow_id]
            studyWorkflows.push([study.letter, workflow.name])
            for (const stepOrder of workflow.steps_order) {
                if (stepOrder.order < study.start || stepOrder.order > study.end) continue

                queueActions.push({
                    study: study,
                    workflow: workflow.name,
                    step: stepOrder.step_name,
                    stepOrder: stepOrder.order,
                    alreadyQueued: [...sampleIDsByStudyStep[`${study.id}-${stepOrder.step_name}`] ?? []]
                })
            }
            return queueActions
        }, []))

        setStudyWorkflows(studyWorkflows)
        setIsFetching(false)
    }, [dispatch, sampleIDs])

    useEffect(() => {
        refreshActions()
    }, [refreshActions])

    const [selectedStudyWorkflow, setSelectedStudyWorkflow] = useState<[Study['letter'], Workflow['name']]>()

    let result: JSX.Element | JSX.Element[] | null = null
    if (isFetching) {
        result = <Spin />
    } else if (sampleIDs.length === 0) {
        result = <div>{`No samples selected.`}</div>
    } else if (commonProjects.length > 0) {
        result = <div>{`The samples selected don't share the same project.`}</div>
    } else {
        result = [
            <Select
                key={'study-workflow-select'}
                placeholder="Select Study-Workflow"
                value={selectedStudyWorkflow ? selectedStudyWorkflow[0] : undefined}
                options={studyWorkflows.map(([study, workflow]) => ({ label: `Study ${study} - ${workflow}`, value: study }))}
                onChange={(value) => {
                    setSelectedStudyWorkflow(studyWorkflows.find(([study]) => study === value))
                }}
                disabled={studyWorkflows.length === 0}
            />,
            <b key={'dequeue'}>Dequeue From</b>,
            ...dequeueActions.filter(
                action => selectedStudyWorkflow && action.study.letter === selectedStudyWorkflow[0]
            ).map(
                action => 
                    <Popover
                        key={`${action.study.id}-${action.step}-dequeue`}
                        content={<>
                            <div>{`Study: ${action.study.letter}`}</div>
                            <div>{`Workflow: ${action.workflow}`}</div>
                            <div>{`Step: ${action.step}`}</div>
                        </>}
                        placement={'left'}
                    >
                        <Button onClick={async () => {
                            try {
                                await dispatch(api.sampleNextStepByStudy.removeList(sampleIDs, action.study.id, action.stepOrder))
                                dispatch(notifySuccess({
                                    id: 'NOTIFICATION_ID',
                                    title: "Samples dequeued from workflow",
                                    description: `Successfully dequeued samples from study ${action.study.letter} at step "${action.step} for project ${projectByID[commonProject].name}"`
                                }))
                                await refreshActions()
                            } catch (error) {
                                dispatch(notifyError({
                                    id: 'NOTIFICATION_ID',
                                    title: "Error dequeuing samples from workflow",
                                    description: `Failed to dequeue samples from study ${action.study.letter} at step "${action.step} for project ${projectByID[commonProject].name}"`
                                }))
                            }
                        }} type="primary">{action.step}</Button>
                    </Popover>
            ),
            <Divider style={{ margin: 0 }} key={'divider'} />,
            <b key={'queue'}>Queue To</b>,
            ...queueActions.filter(
                action => selectedStudyWorkflow && action.study.letter === selectedStudyWorkflow[0]
            ).map(
                action =>
                    <Popover
                        key={`${action.study.id}-${action.step}-queue`}
                        content={
                            action.alreadyQueued.length > 0
                                ? <div>{`${action.alreadyQueued.length} Sample(s) already queued to the study workflow step: ${action.alreadyQueued.map((s) => sampleByID[s].name).join(',')}`}</div>
                                : <>
                                    <div>{`Study: ${action.study.letter}`}</div>
                                    <div>{`Workflow: ${action.workflow}`}</div>
                                    <div>{`Step: ${action.step}`}</div>
                                </>
                        }
                        placement={'left'}
                    >
                        <Button disabled={action.alreadyQueued.length > 0} onClick={async () => {
                            try {
                                await dispatch(api.samples.addSamplesToStudy(exceptedSampleIDs, defaultSelection, commonProject, action.study.letter, action.stepOrder, serializeFilterParamsWithDescriptions(filters)))
                                dispatch(notifySuccess({
                                    id: 'NOTIFICATION_ID',
                                    title: "Samples queued to workflow",
                                    description: `Successfully queued samples to study ${action.study.letter} at step "${action.step} for project ${projectByID[commonProject].name}"`
                                }))
                                await refreshActions()
                            } catch (error) {
                                dispatch(notifyError({
                                    id: 'NOTIFICATION_ID',
                                    title: "Error queuing samples to workflow",
                                    description: `Failed to queue samples to study ${action.study.letter} at step "${action.step} for project ${projectByID[commonProject].name}"`
                                }))
                            }
                        }} type="primary">{action.step}</Button>
                    </Popover>
            )
        ]
    }

return <Flex vertical gap={"middle"}>
        {result}
    </Flex>
}