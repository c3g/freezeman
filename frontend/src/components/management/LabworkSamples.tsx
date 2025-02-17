import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Collapse, Drawer, Flex, Modal, Popover, Select, Spin } from "antd";
import { fetchProjects, fetchSamples, fetchWorkflows } from "../../modules/cache/cache";
import { FilterSet, FilterSetting } from "../../models/paged_items";
import { FMSSampleNextStepByStudy, FMSStudy, FMSWorkflow } from "../../models/fms_api_models";
import { notifyError, notifySuccess } from "../../modules/notification/actions";
import { Project, Sample, Step, Study, Workflow } from "../../models/frontend_models";
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn, ObjectWithSample } from '../samples/SampleTableColumns'
import { SampleAndLibrary } from "../WorkflowSamplesTable/ColumnSets";
import { selectProjectsByID, selectSamplesByID, selectSamplesTable } from "../../selectors";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useQueryParamsForPagedItems } from "../../models/hooks";
import api from "../../utils/api";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../pagedItemsTable/PagedItemsTable";
import SamplesTableActions from '../../modules/samplesTable/actions'
import serializeFilterParamsWithDescriptions from "../pagedItemsTable/serializeFilterParamsTS";

const MAX_SELECTION = 960

interface LabworkSamplesProps {
    fixedFilter?: FilterSetting
}

export function LabworkSamples({ fixedFilter }: LabworkSamplesProps) {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters, fixedFilters } = samplesTableState
    const wholeFilters = useMemo(() => ({ ...filters, ...fixedFilters }), [filters, fixedFilters])

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    useEffect(() => {
        if (fixedFilter) {
            samplesTableCallbacks.clearFixedFiltersCallback()
            samplesTableCallbacks.setFixedFilterCallback(fixedFilter)
            samplesTableCallbacks.refreshPageCallback()
        }
    }, [fixedFilter, samplesTableCallbacks])

    const { setFilterCallback, clearFiltersCallback } = useQueryParamsForPagedItems(SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, samplesTableCallbacks.setFilterCallback, samplesTableCallbacks.clearFiltersCallback)

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
        wholeFilters,
        setFilterCallback,
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

    const [open, setOpen] = useState(false)
    const maybeExpandRightPanel = useCallback(() => {
        if (sampleSelectionCount > MAX_SELECTION) {
            Modal.warning({
                title: "Warning",
                content: `You cannot queue/dequeue more than ${MAX_SELECTION} samples.`,
            })
        } else {
            setOpen(true)
        }
    }, [sampleSelectionCount])
    const collapseRightPanel = useCallback(() => {
        setOpen(false)
    }, [])

    return (
        <>
            <PagedItemsTable<ObjectWithSample>
                getDataObjectsByID={mapSampleIDs}
                pagedItems={samplesTableState}
                columns={columns}
                usingFilters={true}
                initialLoad={false}
                selection={selection}
                topBarExtra={<Button onClick={maybeExpandRightPanel} disabled={sampleSelectionCount < 1}>{`Queue/Dequeue ${sampleSelectionCount} Samples`}</Button>}
                paginationProps={{simple: true}}
                {...samplesTableCallbacks}
                setFilterCallback={setFilterCallback}
                clearFiltersCallback={clearFiltersCallback}
            />
            <Drawer
                title="Queue/Dequeue Samples"
                placement="right"
                size="large"
                onClose={collapseRightPanel}
                open={open}
                destroyOnClose={true}
            >
                <LabworkSampleActions defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={wholeFilters} />
            </Drawer>
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

    const [isFetching, setIsFetching] = useState(false)
    interface ActionInfo {
        study: Pick<FMSStudy, 'id' | 'letter'>
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

    const [selectedProject, setSelectedProject] = useState<Project['id']>()
    const [selectedStudyWorkflow, setSelectedStudyWorkflow] = useState<StudyWorkflow>()

    const refreshActions = useCallback(async () => {
        const sampleIDs = (await dispatch(api.samples.sample_ids_by_default_selection_and_excepted_ids(
            defaultSelection,
            exceptedSampleIDs,
            serializeFilterParamsWithDescriptions(filters)
        ))).data

        if (sampleIDs.length === 0) {
            setQueueActions([])
            setDequeueActions([])
            setStudyWorkflowsByProject({})
            setCommonProjects([])
            setIsFetching(false)
            setSelectedProject(undefined)
            setSelectedStudyWorkflow(undefined)
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
        for (const project of commonProjects) {
            studyWorkflowsByProject[project.id] = []
        }

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
    }, [defaultSelection, dispatch, exceptedSampleIDs, filters])

    useEffect(() => {
        refreshActions()
    }, [refreshActions])

    const projectByID = useAppSelector(selectProjectsByID)
    const sampleByID = useAppSelector(selectSamplesByID)

    // console.info({
    //     commonProjects,
    //     studyWorkflowsByProject,
    //     selectedProject,
    //     selectedStudyWorkflow,
    // })

    const result = useMemo(() => {
        const result: JSX.Element[] = []
        if (isFetching) return <Spin />
        if (!defaultSelection && exceptedSampleIDs.length === 0) return <div>{`Please select samples to queue/dequeue.`}</div>
        if (commonProjects.length === 0) return <div>{`The selected samples don't share any project.`}</div>
        result.push(
            <Select
                key={'project-select'}
                placeholder="Select Project"
                value={selectedProject}
                options={commonProjects.map((project) => ({ label: project.name, value: project.id }))}
                onChange={(value) => {
                    setSelectedProject(value)
                }}
                disabled={commonProjects.length === 0}
            />
        )
        if (!selectedProject) return result
        if (studyWorkflowsByProject[selectedProject].length === 0) {
            result.push(<div key={'3'}>{`The selected project doesn't have any study workflows.`}</div>)
            return result
        }
        result.push(<Select
            key={'study-workflow-select'}
            placeholder="Select Study-Workflow"
            value={selectedStudyWorkflow?.study}
            options={selectedProject ? studyWorkflowsByProject[selectedProject].map(({ study, workflow }) => ({ label: `Study ${study} - ${workflow}`, value: study })) : []}
            onChange={(value) => {
                if (selectedProject) {
                    setSelectedStudyWorkflow(studyWorkflowsByProject[selectedProject].find(({ study }) => study === value))
                }
            }}
        />)
        if (selectedProject && selectedStudyWorkflow) {
            const projectDequeueActions = dequeueActions.filter(action =>
                selectedStudyWorkflow && action.study.letter === selectedStudyWorkflow.study
            ).map(action => {
                return <Popover
                    key={`${action.study.id}-${action.stepOrder}-dequeue`}
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
                            const sampleIDs = (await dispatch(api.samples.sample_ids_by_default_selection_and_excepted_ids(
                                defaultSelection,
                                exceptedSampleIDs,
                                serializeFilterParamsWithDescriptions(filters)
                            ))).data
                            const removed = (await dispatch(api.sampleNextStepByStudy.removeList(sampleIDs, action.study.id, action.stepOrder))).data.details
                            const samplesRemovedCount = Object.values(removed).filter((r) => r).length
                            dispatch(notifySuccess({
                                id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                title: "Samples dequeued from workflow",
                                description: `Successfully dequeued ${samplesRemovedCount} samples from study ${action.study.letter} at step "${action.step}" for project ${project.name}."`
                            }))
                            await refreshActions()
                        } catch (error) {
                            dispatch(notifyError({
                                id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                title: "Error dequeuing samples from workflow",
                                description: `Failed to dequeue samples from study ${action.study.letter} at step "${action.step}" for project ${project.name}".`
                            }))
                        }
                    }} type="primary">{`${action.stepOrder}. ${action.step}`}</Button>
                </Popover>
            })
            const projectQueueActions = queueActions.filter(action =>
                selectedStudyWorkflow && action.study.letter === selectedStudyWorkflow.study
            ).map(action => {
                return <Popover
                    key={`${action.study.id}-${action.stepOrder}-queue`}
                    content={
                        action.alreadyQueued.length > 0
                            ? <div>{`${action.alreadyQueued.length} Sample(s) already queued to the study workflow step: ${action.alreadyQueued.map((s) => sampleByID[s].name).join(', ')}`}</div>
                            : <>
                                <div>{`Study: ${action.study.letter}`}</div>
                                <div>{`Workflow: ${action.workflow}`}</div>
                                <div>{`Step: ${action.step}`}</div>
                            </>
                    }
                    placement={'left'}
                    style={{ padding: '1em' }}
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
                            const errors = error.data['queue_sample_to_study_workflow']
                            dispatch(notifyError({
                                id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                                title: "Error queuing samples to workflow",
                                description: `${errors[0]}${errors[0].endsWith('.') ? '' : '.'}${errors.length > 1 ? ' And ' + (errors.length - 1) + ' more errors...' : ''}`,
                                duration: 5
                            }))
                        }
                    }} type="primary">{`${action.stepOrder}. ${action.step}`}</Button>
                </Popover>
            })
            result.push(
                <Collapse key={'actions'} accordion items={[
                    {
                        key: 'dequeue',
                        label: `Dequeue Options (${projectDequeueActions.length})`,
                        children: <Flex wrap gap={"small"}>{projectDequeueActions}</Flex>,
                        classNames: { body: 'labwork-samples-actions' },
                    },
                    {
                        key: 'queue',
                        label: `Queue Options (${projectQueueActions.length})`,
                        children: <Flex wrap gap={"small"}>{projectQueueActions}</Flex>,
                        classNames: { body: 'labwork-samples-actions' },
                    }
                ]}/>
            )
        }
        return result
    }, [commonProjects, defaultSelection, dequeueActions, dispatch, exceptedSampleIDs, filters, isFetching, projectByID, queueActions, refreshActions, sampleByID, selectedProject, selectedStudyWorkflow, studyWorkflowsByProject])

    try {        
        return <Flex vertical gap={"middle"}>{result}</Flex>
    } catch (error) {
        return <div>{`Error: ${error}`}</div>
    }
}