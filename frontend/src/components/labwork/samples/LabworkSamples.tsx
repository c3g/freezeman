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
import { fetchProjects, fetchSamples, fetchWorkflows } from "../../../modules/cache/cache";
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
        SAMPLE_COLUMN_FILTERS,
        SAMPLE_FILTER_KEYS,
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
            <AppPageHeader title="Samples and Libraries" />
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
                            paginationProps={{
                                showQuickJumper: false,
                                showTotal(total, range) {
                                    return <>
                                        <>{`${total} items.`}</>
                                        <>{' '}</>
                                        <b style={{ color: '#1890ff' }}>{`${sampleSelectionCount} selected`}</b>
                                        .
                                    </>
                                }
                            }}
                            {...samplesTableCallbacks}
                        />
                    </Col>
                    <Col span={6}>
                        <LabworkSampleActions defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={filters} />
                    </Col>
                </Row>
            </PageContent>
        </>
    )
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

    interface ActionInfo {
        study: FMSStudy
        workflow: FMSWorkflow['name']
        step: Step['name']
        stepOrder: FMSSampleNextStepByStudy['step_order'],
        alreadyQueued: Sample['id'][]
    }
    const [dequeueActions, setDequeueActions] = useState<ActionInfo[]>([])
    const [queueActions, setQueueActions] = useState<ActionInfo[]>([])

    interface StudyWorkflow {
        study: Study['letter']
        workflow: Workflow['name']
    }
    const [studyWorkflowsByProject, setStudyWorkflowsByProject] = useState<Record<Project['id'], StudyWorkflow[]>>({})

    interface CommonProject {
        id: Project['id']
        name: Project['name']
    }
    const [commonProjects, setCommonProjects] = useState<CommonProject[]>([])

    useEffect(() => {
        // console.info({ defaultSelection, exceptedSampleIDs, filters })
        dispatch(api.samples.sample_ids_by_default_selection_excepted_ids(
            defaultSelection,
            exceptedSampleIDs,
            serializeFilterParamsWithDescriptions(filters)
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
            setStudyWorkflowsByProject({})
            setCommonProjects([])
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
        const studyStepCount: Record<string, number> = {}
        const sampleIDsByStudyStep: Record<StudyStepKey, Set<Sample['id']>> = {}
        for (const sampleNextStep of sampleNextSteps) {
            for (const study of sampleNextStep.studies) {
                const key: StudyStepKey = `${study}-${sampleNextStep.step.name}`

                studyStepCount[key] = (studyStepCount[key] ?? 0) + 1

                if (!sampleIDsByStudyStep[key]) {
                    sampleIDsByStudyStep[key] = new Set()
                }
                sampleIDsByStudyStep[key].add(sampleNextStep.sample)
            }
        }
        type StudyStepPair = [Study['id'], Step['name']]
        const commonStudySteps = Object.entries(studyStepCount).reduce<StudyStepPair[]>((acc, [key, count]) => {
            if (count === sampleIDs.length) {
                const [study, stepName] = key.split('-')
                acc.push([parseInt(study), stepName])
            }
            return acc
        }, [])
        // console.info({ sampleIDs, sampleNextSteps, studyStepCount, sampleIDsByStudyStep, commonStudySteps })

        const countByProjectID = Object.values(projectsBySample).reduce<Record<Project['id'], number>>((acc, projects) => {
            for (const project of projects) {
                acc[project] = (acc[project] ?? 0) + 1
            }
            return acc
        }, {})
        const projectIDs = Object.keys(countByProjectID).map((id) => parseInt(id))
        const commonProjects = (await fetchProjects(projectIDs)).map((project) => ({
            id: project.id,
            name: project.name
        }))
        // console.info({ projectsBySample, countByProjectID, commonProjects })
        setCommonProjects(commonProjects)

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
        // console.info({ studyByID, workflowByID })

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

        const studyWorkflowsByProject: Record<Project['id'], StudyWorkflow[]> = {}

        setQueueActions(Object.values(studyByID).reduce<ActionInfo[]>((queueActions, study) => {
            if (!commonProjects.find(project => project.id === study.project_id)) return queueActions
            const workflow = workflowByID[study.workflow_id]

            const studyWorkflows = studyWorkflowsByProject[study.project_id] ?? []
            studyWorkflows.push({ study: study.letter, workflow: workflow.name })
            studyWorkflowsByProject[study.project_id] = studyWorkflows

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

        setStudyWorkflowsByProject(studyWorkflowsByProject)
        setIsFetching(false)
    }, [dispatch, sampleIDs])

    useEffect(() => {
        refreshActions()
    }, [refreshActions])

    const [selectedStudyWorkflow, setSelectedStudyWorkflow] = useState<StudyWorkflow>()
    const [selectedProject, setSelectedProject] = useState<Project['id']>()

    // console.info({
    //     commonProjects,
    //     studyWorkflowsByProject,
    //     selectedProject,
    //     selectedStudyWorkflow,
    // })

    try {
        let result: JSX.Element | JSX.Element[] | null = null
        if (isFetching) {
            result = <Spin />
        } else if (sampleIDs.length === 0) {
            result = <div>{`No samples selected.`}</div>
        } else if (commonProjects.length === 0) {
            result = <div>{`The selected samples don't share any project.`}</div>
        } else {
            result = [
                <Select
                    key={'project-select'}
                    placeholder="Select Project"
                    value={selectedProject}
                    options={commonProjects.map((project) => ({ label: project.name, value: project.id }))}
                    onChange={(value) => {
                        setSelectedProject(value)
                    }}
                    disabled={commonProjects.length === 0}
                />,
                <Select
                    key={'study-workflow-select'}
                    placeholder="Select Study-Workflow"
                    value={selectedStudyWorkflow?.study}
                    options={selectedProject ? studyWorkflowsByProject[selectedProject].map(({ study, workflow }) => ({ label: `Study ${study} - ${workflow}`, value: study })) : []}
                    onChange={(value) => {
                        if (selectedProject) {
                            setSelectedStudyWorkflow(studyWorkflowsByProject[selectedProject].find(({ study }) => study === value))
                        }
                    }}
                    disabled={!selectedProject || Object.keys(studyWorkflowsByProject).length === 0}
                />,
                <b key={'dequeue'}>Dequeue From</b>,
                ...dequeueActions.filter(
                    action => selectedStudyWorkflow && action.study.letter === selectedStudyWorkflow.study
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
                                if (!selectedProject) return
                                const project = projectByID[selectedProject]
                                try {
                                    await dispatch(api.sampleNextStepByStudy.removeList(sampleIDs, action.study.id, action.stepOrder))
                                    dispatch(notifySuccess({
                                        id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                        title: "Samples dequeued from workflow",
                                        description: `Successfully dequeued samples from study ${action.study.letter} at step "${action.step}" for project ${project.name}"`
                                    }))
                                    await refreshActions()
                                } catch (error) {
                                    dispatch(notifyError({
                                        id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                        title: "Error dequeuing samples from workflow",
                                        description: `Failed to dequeue samples from study ${action.study.letter} at step "${action.step}" for project ${project.name}"`
                                    }))
                                }
                            }} type="primary">{action.step}</Button>
                        </Popover>
                ),
                <Divider style={{ margin: 0 }} key={'divider'} />,
                <b key={'queue'}>Queue To</b>,
                ...queueActions.filter(
                    action => selectedStudyWorkflow && action.study.letter === selectedStudyWorkflow.study
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
                                if (!selectedProject) return
                                const project = projectByID[selectedProject]
                                try {
                                    await dispatch(api.samples.addSamplesToStudy(exceptedSampleIDs, defaultSelection, selectedProject, action.study.letter, action.stepOrder, serializeFilterParamsWithDescriptions(filters)))
                                    dispatch(notifySuccess({
                                        id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                        title: "Samples queued to workflow",
                                        description: `Successfully queued samples to study ${action.study.letter} at step "${action.step} for project ${project.name}"`
                                    }))
                                    await refreshActions()
                                } catch (error) {
                                    dispatch(notifyError({
                                        id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                        title: "Error queuing samples to workflow",
                                        description: `Failed to queue samples to study ${action.study.letter} at step "${action.step} for project ${project.name}"`
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
    } catch (error) {
        console.info({
            commonProjects,
            studyWorkflowsByProject,
            selectedProject,
            selectedStudyWorkflow,
            queueActions,
            dequeueActions,
        })
        return <div>{`Error: ${error}`}</div>
    }
}