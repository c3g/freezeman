import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Collapse, Drawer, Flex, Modal, Popover, Select, Spin } from "antd";
import { fetchProjects, fetchSamples, fetchWorkflows } from "../../modules/cache/cache";
import { FilterSet } from "../../models/paged_items";
import { FMSSampleNextStep, FMSSampleNextStepByStudy, FMSStudy, FMSWorkflow } from "../../models/fms_api_models";
import { notifyError, notifySuccess } from "../../modules/notification/actions";
import { Project, Sample, Step, Study, Workflow } from "../../models/frontend_models";
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn, ObjectWithSample, SampleColumnID } from '../samples/SampleTableColumns'
import { SampleAndLibrary } from "../WorkflowSamplesTable/ColumnSets";
import { selectProjectsByID, selectSamplesByID, selectSamplesTable } from "../../selectors";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import api from "../../utils/api";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../pagedItemsTable/PagedItemsTable";
import SamplesTableActions from '../../modules/samplesTable/actions'
import serializeFilterParamsWithDescriptions from "../pagedItemsTable/serializeFilterParamsTS";
import { fetchSamplesByDefaultSelectionAndExceptedIDs } from "../pagedItemsTable/functions";
import { useSearchParams } from "react-router-dom";
import DropdownListItems from "../DropdownListItems";

const MAX_SELECTION = 960

interface LabworkSamplesProps {
}

export function WorkflowAssignment(props: LabworkSamplesProps) {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters, fixedFilters } = samplesTableState

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    const [searchParams] = useSearchParams()
    useEffect(() => {
        samplesTableCallbacks.clearFiltersCallback()
        for (const [columnID, value] of searchParams.entries()) {
            const COLUMN_ID = columnID.toUpperCase()
            const description = {
                ...SAMPLE_COLUMN_FILTERS[COLUMN_ID],
                key: SAMPLE_FILTER_KEYS[COLUMN_ID],
            }
            samplesTableCallbacks.setFilterCallback(
                value,
                description
            )
            samplesTableCallbacks.setFilterOptionsCallback(
                description,
                {
                    exactMatch: true,
                }
            )
        }
        samplesTableCallbacks.refreshPageCallback()
        return () => {
            samplesTableCallbacks.clearFiltersCallback()
        }
    }, [samplesTableCallbacks, searchParams])

    const [sampleNextStepsBySampleID, setSampleNextStepsBySampleID] = useState<Record<Sample['id'], FMSSampleNextStep[]>>([])
    const dispatch = useAppDispatch()
    useEffect(() => {
        (async () => {
            const sampleNextSteps = (await dispatch(api.sampleNextStep.listSamples([...samplesTableState.items]))).data.results
            setSampleNextStepsBySampleID(sampleNextSteps.reduce<Record<Sample['id'], FMSSampleNextStep[]>>((acc, sampleNextStep) => {
                acc[sampleNextStep.sample] ??= []
                acc[sampleNextStep.sample].push(sampleNextStep) 
                return acc
            }, {}))
        })()
    }, [dispatch, samplesTableState.items])

    const SAMPLES_TABLE_COLUMNS: SampleColumn[] = useMemo(() => {
        return [
            SAMPLE_COLUMN_DEFINITIONS.NAME,
            SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
            SAMPLE_COLUMN_DEFINITIONS.PARENT_CONTAINER,
            SAMPLE_COLUMN_DEFINITIONS.PARENT_COORDINATES,
            SAMPLE_COLUMN_DEFINITIONS.PROJECT,
            SAMPLE_COLUMN_DEFINITIONS.QC_FLAG,
            {
                columnID: SampleColumnID.QUEUED_STEPS,
                title: 'Queued Steps',
                dataIndex: ['sample', 'id'],
                render: (_, { sample }) => {
                    if (!sample) return null
                    const sampleNextSteps = sampleNextStepsBySampleID[sample.id]
                    if (!sampleNextSteps) return <Spin size={"small"} />
                    return <DropdownListItems listItems={sampleNextSteps.map(s => s.step.name)} />
                },
                sorter: { multiple: 1 },
                width: 175
            } as SampleColumn
        ]
    }, [sampleNextStepsBySampleID])

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

    const wholeFilters = useMemo(() => ({ ...filters, ...fixedFilters }), [filters, fixedFilters])

    return (
        <>
            <PagedItemsTable<ObjectWithSample>
                getDataObjectsByID={mapSampleIDs}
                pagedItems={samplesTableState}
                columns={columns}
                usingFilters={true}
                initialLoad={false}
                selection={selection}
                topBarExtra={<Button
                    onClick={maybeExpandRightPanel}
                    disabled={sampleSelectionCount < 1}>{`Queue/Dequeue ${sampleSelectionCount} Samples`}</Button>}
                paginationProps={{simple: true}}
                {...samplesTableCallbacks}
            />
            <Drawer
                title="Queue/Dequeue Samples"
                placement="right"
                size="large"
                onClose={collapseRightPanel}
                open={open}
                destroyOnClose={true}
            >
                <WorkflowOptions defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={wholeFilters} />
            </Drawer>
        </>
    )
}

interface LabworkSampleActionsProps {
    defaultSelection: boolean
    exceptedSampleIDs: Sample['id'][]
    filters: FilterSet
}
function WorkflowOptions({ defaultSelection, exceptedSampleIDs, filters }: LabworkSampleActionsProps) {
    const dispatch = useAppDispatch()

    const [isFetching, setIsFetching] = useState<string | null>(null)
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
        study: Pick<Study, 'id' | 'letter'>
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
        setIsFetching("Loading samples...")
        const samples = await dispatch(fetchSamplesByDefaultSelectionAndExceptedIDs(defaultSelection, exceptedSampleIDs, serializeFilterParamsWithDescriptions(filters)))
        const sampleIDs = samples.map(sample => sample.id)

        if (samples.length === 0) {
            setQueueActions([])
            setDequeueActions([])
            setStudyWorkflowsByProject({})
            setCommonProjects([])
            setSelectedProject(undefined)
            setSelectedStudyWorkflow(undefined)
            setIsFetching(null)
            return
        }

        setIsFetching("Loading pools...")
        const pooledSamples = (await dispatch(api.pooledSamples.list({ sample__id__in: sampleIDs.join(',') }))).data.results
        const projectsBySample = [...samples, ...pooledSamples].reduce<Record<Sample['id'], Set<Project['id']>>>((acc, sample) => {
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

        setIsFetching("Loading common steps...")
        type StudyStepOrderKey = `${FMSSampleNextStepByStudy['study']}-${FMSSampleNextStepByStudy['step_order']}`
        const sampleNextStepByStudyList = (await dispatch(api.sampleNextStepByStudy.getStudySamples({ sample_next_step__sample__id__in: sampleIDs.join(','), limit: 10000 }))).data.results
        const countByStudyStepOrder: Record<StudyStepOrderKey, number> = {}
        const sampleIDsByStudyStepOrder: Record<StudyStepOrderKey, Set<Sample['id']>> = {}
        for (const { study, step_order, sample } of sampleNextStepByStudyList) {
            const key: StudyStepOrderKey = `${study}-${step_order}`

            countByStudyStepOrder[key] = (countByStudyStepOrder[key] ?? 0) + 1

            if (!sampleIDsByStudyStepOrder[key]) {
                sampleIDsByStudyStepOrder[key] = new Set()
            }
            sampleIDsByStudyStepOrder[key].add(sample)
        }
        type StudyStepOrderPair = [FMSSampleNextStepByStudy['study'], FMSSampleNextStepByStudy['step_order']]
        const studyStepOrderPairs = Object.entries(countByStudyStepOrder).reduce<StudyStepOrderPair[]>((acc, [key, count]) => {
            if (count > 0) {
                const [study, stepOrder] = key.split('-')
                acc.push([parseInt(study), parseInt(stepOrder)])
            }
            return acc
        }, [])

        setIsFetching("Loading projects...")
        const countByProjectID = Object.values(projectsBySample).reduce<Record<Project['id'], number>>((acc, projects) => {
            for (const project of projects) {
                acc[project] = (acc[project] ?? 0) + 1
            }
            return acc
        }, {})
        const commonProjectIDs = Object.entries(countByProjectID).reduce<Array<Project['id']>>((acc, [projectID, count]) => {
            if (count === samples.length) {
                acc.push(parseInt(projectID))
            }
            return acc
        }, [])
        if (commonProjectIDs.length === 0) {
            setCommonProjects([])
            setIsFetching(null)
            return
        }
        const commonProjects = (await fetchProjects(commonProjectIDs)).map((project) => ({
            id: project.id,
            name: project.name
        }))
        setCommonProjects(commonProjects)

        setIsFetching("Loading studies and workflows...")
        const studyByID = commonProjectIDs.length === 0 ? [] : (await dispatch(api.studies.list({ project__id__in: commonProjectIDs.join(',') }))).data.results.reduce<Record<FMSStudy['id'], FMSStudy>>((acc, study) => {
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

        const dequeueActions: ActionInfo[] = []
        for (const [studyID, stepOrderID] of studyStepOrderPairs) {
            const workflow = workflowByID[studyByID[studyID].workflow_id]
            const workflowStepOrder = workflow.steps_order.find(s => s.id === stepOrderID)
            if (workflowStepOrder == undefined) continue
            dequeueActions.push({
                study: studyByID[studyID],
                workflow: workflow.name,
                step: workflowStepOrder.step_name,
                stepOrder: workflowStepOrder.order,
                alreadyQueued: [],
            })
        }
        dequeueActions.sort((a, b) => a.stepOrder - b.stepOrder)
        setDequeueActions(dequeueActions)

        const queueActions: ActionInfo[] = []
        const studyWorkflowsByProject: Record<Project['id'], StudyWorkflow[]> = commonProjects.reduce((acc, project) => {
            acc[project.id] = []
            return acc
        }, {})
        for (const study of Object.values(studyByID)) {
            if (!commonProjects.find(project => project.id === study.project_id)) continue
            const workflow = workflowByID[study.workflow_id]

            const studyWorkflows = studyWorkflowsByProject[study.project_id] ?? []
            studyWorkflows.push({ study: study, workflow: workflow.name })
            studyWorkflowsByProject[study.project_id] = studyWorkflows

            for (const stepOrder of workflow.steps_order) {
                if (stepOrder.order < study.start || stepOrder.order > study.end) continue
                queueActions.push({
                    study: study,
                    workflow: workflow.name,
                    step: stepOrder.step_name,
                    stepOrder: stepOrder.order,
                    alreadyQueued: [...sampleIDsByStudyStepOrder[`${study.id}-${stepOrder.id}`] ?? []]
                })
            }
        }
        queueActions.sort((a, b) => a.stepOrder - b.stepOrder)
        setQueueActions(queueActions)
        setStudyWorkflowsByProject(studyWorkflowsByProject)

        setIsFetching(null)
    }, [defaultSelection, dispatch, exceptedSampleIDs, filters])

    useEffect(() => {
        refreshActions()
    }, [refreshActions])

    const projectByID = useAppSelector(selectProjectsByID)
    const sampleByID = useAppSelector(selectSamplesByID)

    const result = useMemo(() => {
        const result: JSX.Element[] = []
        if (isFetching) return <Spin>{isFetching}</Spin>
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
            value={selectedStudyWorkflow?.study.id}
            options={studyWorkflowsByProject[selectedProject].map(({ study, workflow }) => ({ label: `Study ${study.letter} - ${workflow}`, value: study.id }))}
            onChange={(value) => {
                if (selectedProject) {
                    setSelectedStudyWorkflow(studyWorkflowsByProject[selectedProject].find(({ study }) => study.id === value))
                }
            }}
        />)

        if (!(selectedProject && selectedStudyWorkflow)) return result
        const projectDequeueActions = dequeueActions.filter(action =>
            action.study.id === selectedStudyWorkflow.study.id
        ).map(action => {
            return <Button
                className="left-aligned-ant-btn"
                key={`${action.study.id}-${action.stepOrder}-dequeue`}
                onClick={async () => {
                    const project = projectByID[selectedProject]
                    try {
                        setIsFetching(`Dequeuing samples...`)
                        const sampleIDs = (await dispatch(fetchSamplesByDefaultSelectionAndExceptedIDs(
                            defaultSelection,
                            exceptedSampleIDs,
                            serializeFilterParamsWithDescriptions(filters)
                        ))).map(sample => sample.id)
                        const removed = (await dispatch(api.sampleNextStepByStudy.removeList(sampleIDs, action.study.id, action.stepOrder))).data
                        const samplesRemovedCount = removed.length
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
                    } finally {
                        setIsFetching(null)
                    }
                }}
                type="primary"
            >{`${action.stepOrder.toString().padEnd(2, ' ')} - ${action.step}`}</Button>
        })
        const projectQueueActions = queueActions.filter(action =>
            action.study.id === selectedStudyWorkflow.study.id
        ).map(action => {
            const key = `${action.study.id}-${action.stepOrder}-queue`
            const button = <Button
                className="left-aligned-ant-btn"
                disabled={action.alreadyQueued.length > 0}
                key={key}
                onClick={async () => {
                    if (!selectedProject) return
                    const project = projectByID[selectedProject]
                    try {
                        setIsFetching(`Queueing samples...`)
                        await dispatch(api.samples.addSamplesToStudy(exceptedSampleIDs, defaultSelection, selectedProject, action.study.letter, action.stepOrder, serializeFilterParamsWithDescriptions(filters)))
                        dispatch(notifySuccess({
                            id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                            title: "Samples queued to workflow",
                            description: `Successfully queued samples to study ${action.study.letter} at step "${action.step} for project ${project.name}"`
                        }))
                        await refreshActions()
                    } catch (error) {
                        const errors: string[] | undefined = error.data?.['queue_sample_to_study_workflow']
                        dispatch(notifyError({
                            id: `LabworkSamples_${action.study.id}_${action.stepOrder}`,
                            title: "Error queuing samples to workflow",
                            description: errors ? `${errors[0]}${errors[0].endsWith('.') ? '' : '.'}${errors.length > 1 ? ' And ' + (errors.length - 1) + ' more errors...' : ''}` : `Could not queue samples to study ${action.study.letter} at step "${action.step}" for project ${project.name}".`,
                            duration: 5
                        }))
                    } finally {
                        setIsFetching(null)
                    }}}
                    type="primary"
            >{`${action.stepOrder.toString().padEnd(2, ' ')} - ${action.step}`}</Button>
            return action.alreadyQueued.length > 0 ? <Popover
                key={key}
                content={<div>{`${action.alreadyQueued.length} Sample(s) already queued to the study workflow step: ${action.alreadyQueued.map((s) => sampleByID[s].name).join(', ')}`}</div>}
                placement={'left'}
                style={{ padding: '1em' }}
            >
                {button}
            </Popover> : button
        })
        result.push(
            <Collapse key={'actions'} accordion items={[
                {
                    key: 'dequeue',
                    label: `(${projectDequeueActions.length}) Dequeue From Step`,
                    children: <Flex gap={"small"} vertical>{projectDequeueActions}</Flex>,
                    classNames: { body: 'labwork-samples-actions' },
                },
                {
                    key: 'queue',
                    label: `(${projectQueueActions.length}) Queue To Step`,
                    children: <Flex gap={"small"} vertical>{projectQueueActions}</Flex>,
                    classNames: { body: 'labwork-samples-actions' },
                }
            ]}/>
        )
        return result
    }, [commonProjects, defaultSelection, dequeueActions, dispatch, exceptedSampleIDs, filters, isFetching, projectByID, queueActions, refreshActions, sampleByID, selectedProject, selectedStudyWorkflow, studyWorkflowsByProject])

    try {        
        return <Flex vertical gap={"middle"}>{result}</Flex>
    } catch (error) {
        return <div>{`Error: ${error}`}</div>
    }
}