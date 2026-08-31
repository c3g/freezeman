import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Drawer, Flex, Modal, Select, Space, Spin } from "antd";
import { fetchSamples } from "../../modules/cache/cache";
import { FilterSet } from "../../models/paged_items";
import { FMSProject, FMSSampleNextStep, FMSStudy, FMSWorkflow } from "../../models/fms_api_models";
import { notifyError, notifySuccess } from "../../modules/notification/actions";
import { Sample, Study } from "../../models/frontend_models";
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn, ObjectWithSample, SampleColumnID } from '../samples/SampleTableColumns'
import { SampleAndLibraryAndIdentity } from "../WorkflowSamplesTable/ColumnSets";
import { selectSamplesTable } from "../../selectors";
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
import { toTitleCase } from "../../utils/functions";

const MAX_SELECTION = 960

const WORKFLOW_ACTIONS = ["queue", "dequeue", "skip"] as const
type WorkflowAction = typeof WORKFLOW_ACTIONS[number]

export interface WorkflowAssignmentProps {
    initialExceptedSampleIDs?: Sample['id'][]
}

export function WorkflowAssignment({ initialExceptedSampleIDs }: WorkflowAssignmentProps) {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters, fixedFilters } = samplesTableState

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    const [searchParams] = useSearchParams()
    const [searchParamsProcessed, setSearchParamsProcessed] = useState(false)
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
        setSearchParamsProcessed(true)
        return () => {
            samplesTableCallbacks.clearFiltersCallback()
        }
    }, [samplesTableCallbacks, searchParams])

    const [sampleNextStepsBySampleID, setSampleNextStepsBySampleID] = useState<Record<Sample['id'], FMSSampleNextStep[]>>({})
    const dispatch = useAppDispatch()
    useEffect(() => {
        (async () => {
            if (samplesTableState.items.length === 0) {
                setSampleNextStepsBySampleID({})
                return
            }

            const newSampleNextStepsBySampleID: Record<Sample['id'], FMSSampleNextStep[]> = {}
            for (const sampleID of samplesTableState.items) {
                newSampleNextStepsBySampleID[sampleID] = []
            }

            const sampleNextSteps = (await dispatch(api.sampleNextStep.listSamples([...samplesTableState.items]))).data.results
            for (const sampleNextStep of sampleNextSteps) {
                newSampleNextStepsBySampleID[sampleNextStep.sample].push(sampleNextStep)
            }
            setSampleNextStepsBySampleID(newSampleNextStepsBySampleID)
        })()
    }, [dispatch, samplesTableState.items])

    const SAMPLES_TABLE_COLUMNS: SampleColumn[] = useMemo(() => {
        return [
            SAMPLE_COLUMN_DEFINITIONS.NAME,
            SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
            SAMPLE_COLUMN_DEFINITIONS.COORDINATES,
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
        }, {} as Record<string, SampleAndLibraryAndIdentity>)
        return Promise.resolve(dataObjectsByID)
    }, [samples])

    const [defaultSelection, setDefaultSelection] = useState(false)
    const [exceptedSampleIDs, setExceptedSampleIDs] = useState(initialExceptedSampleIDs ?? [])
    const sampleSelectionCount = defaultSelection ? samplesTableState.totalCount - exceptedSampleIDs.length : exceptedSampleIDs.length
    const selection: NonNullable<PagedItemsTableProps<SampleAndLibraryAndIdentity>['selection']> = useMemo(() => ({
        onSelectionChanged: (selectedItems, selectAll) => {
            setExceptedSampleIDs(selectedItems.map(id => parseInt(id as string)))
            setDefaultSelection(selectAll)
        },
        initialExceptedItems: initialExceptedSampleIDs?.map(id => id.toString()) ?? []
    }), [initialExceptedSampleIDs])

    const [openForAction, setOpenFor] = useState<WorkflowAction | null>(null)
    const maybeExpandRightPanel = useCallback((actionName: WorkflowAction) => {
        if (sampleSelectionCount > MAX_SELECTION) {
            Modal.warning({
                title: "Warning",
                content: `You cannot ${WORKFLOW_ACTIONS.join("/")} more than ${MAX_SELECTION} samples.`,
            })
        } else {
            setOpenFor(actionName)
        }
    }, [sampleSelectionCount])
    const collapseRightPanel = useCallback(() => {
        setOpenFor(null)
    }, [])

    const wholeFilters = useMemo(() => ({ ...filters, ...fixedFilters }), [filters, fixedFilters])

    const refresh = useCallback(() => {
        return samplesTableCallbacks.refreshPageCallback()
    }, [samplesTableCallbacks])

    return (
        <>
            {searchParamsProcessed && <PagedItemsTable<ObjectWithSample>
                getDataObjectsByID={mapSampleIDs}
                pagedItems={samplesTableState}
                columns={columns}
                usingFilters={true}
                initialLoad={false}
                selection={selection}
                topBarExtra={<Space>
                    {WORKFLOW_ACTIONS.map((action) => (
                        <Button
                            key={action}
                            onClick={() => maybeExpandRightPanel(action)}
                            disabled={sampleSelectionCount < 1}>
                                {`${toTitleCase(action)}`}
                        </Button>
                    ))}
                    {`${sampleSelectionCount} Samples Selected`}
                </Space>}
                paginationProps={{simple: true}}
                {...samplesTableCallbacks}
            />}
            {
                openForAction &&
                <Drawer
                    title={`${toTitleCase(openForAction)} ${sampleSelectionCount} Samples`}
                    placement="right"
                    size="large"
                    onClose={collapseRightPanel}
                    open={openForAction === null || sampleSelectionCount == 0 ? false : true}
                    destroyOnHidden={true}
                >
                    <WorkflowOptions actionName={openForAction} defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={wholeFilters} refresh={refresh} />
                </Drawer>
            }
        </>
    )
}

interface LabworkSampleActionsProps {
    actionName: WorkflowAction
    defaultSelection: boolean
    exceptedSampleIDs: Sample['id'][]
    filters: FilterSet
    refresh: () => Promise<void>
}
function WorkflowOptions({ actionName, defaultSelection, exceptedSampleIDs, filters, refresh }: LabworkSampleActionsProps) {
    const dispatch = useAppDispatch()

    const [sampleCount, setSampleCount] = useState<number>()

    const [commonProjects, setCommonProjects] = useState<FMSProject[]>()
    const [selectedProject, setSelectedProject] = useState<NonNullable<typeof commonProjects>[0]>()

    const [studies, setStudies] = useState<FMSStudy[]>()
    const [selectedStudy, setSelectedStudy] = useState<NonNullable<typeof studies>[0]>()

    const [workflowByStudy, setWorkflowByStudy] = useState<Record<Study['id'], FMSWorkflow>>()

    useEffect(() => {
        (async () => {
            const samples = await dispatch(fetchSamplesByDefaultSelectionAndExceptedIDs(defaultSelection, exceptedSampleIDs, serializeFilterParamsWithDescriptions(filters)))
            const sampleIDs = samples.map(({ id }) => id)

            const commonProjects = (await dispatch(api.projects.list({ project_derived_by_samples__sample__id__in: sampleIDs }))).data.results
            commonProjects.sort((a, b) => a.name.localeCompare(b.name))

            setSampleCount(sampleIDs.length)
            setCommonProjects(commonProjects)
            setSelectedProject(undefined)
        })()
    }, [defaultSelection, dispatch, exceptedSampleIDs, filters])


    useEffect(() => {
        (async () => {
            if (!selectedProject) {
                return
            }

            const studies = (await dispatch(api.studies.listProjectStudies(selectedProject.id))).data.results
            studies.sort((a, b) => a.letter.localeCompare(b.letter))

            const workflows = (await dispatch(api.workflows.list({ id__in: studies.map((s) => s.workflow_id).join(",") }))).data.results

            setWorkflowByStudy(workflows.reduce<typeof workflowByStudy>((acc, curr) => {
                const study = studies.find((s) => s.workflow_id === curr.id)
                if (study) {
                    acc = acc ?? {}
                    acc[study.id] = curr
                }
                return acc
            }, {}))
            setStudies(studies)
        })()
    }, [dispatch, selectedProject])

    const result = useMemo(() => {
        const result: JSX.Element[] = []
        if (sampleCount === 0) return <div key={"sampleCount"}>{`Please select at least one sample to ${actionName}.`}</div>
        if (commonProjects === undefined) return <Spin>Loading projects...</Spin>
        if (commonProjects.length === 0) return <div key={"commonProjects"}>{`The selected samples don't share any project.`}</div>
        result.push(
            <Select
                key={'project-select'}
                placeholder="Select Project"
                value={selectedProject?.id}
                options={commonProjects.map((project) => ({ label: project.name, value: project.id }))}
                onChange={(value) => {
                    setStudies(undefined)
                    setSelectedStudy(undefined)
                    setWorkflowByStudy(undefined)
                    setSelectedProject(commonProjects.find((p) => p.id == value))
                }}
                disabled={commonProjects.length === 0}
            />
        )

        if (!selectedProject) return result

        if (studies === undefined || workflowByStudy == undefined) {
            result.push(<Spin key={"spin"}>Loading studies and workflows...</Spin>)
            return result
        }

        result.push(<Select
            key={'study-workflow-select'}
            placeholder="Select Study-Workflow"
            value={selectedStudy?.id}
            options={studies
                .filter((c) => c.project_id == selectedProject.id)
                .map((study) => ({ label: `Study ${study.letter} - ${workflowByStudy[study.id].name}`, value: study.id }))
            }
            onChange={(value) => {
                setSelectedStudy(studies?.find((s) => s.id == value))
            }}
        />)

        if (!selectedStudy) return result

        const workflow = workflowByStudy[selectedStudy.id]

        for (const step of workflow.steps_order) {
            result.push(
                <Button
                    className="left-aligned-ant-btn"
                    key={step.order}
                    type="primary"
                    onClick={async () => {
                        const NOTIFICATION_KEY = `LabworkSamples_${selectedStudy.id}_${step.order}` as const
                        if (actionName == "dequeue") {
                            try {
                                const sampleIDs = (await dispatch(fetchSamplesByDefaultSelectionAndExceptedIDs(
                                    defaultSelection,
                                    exceptedSampleIDs,
                                    serializeFilterParamsWithDescriptions(filters)
                                ))).map(sample => sample.id)
                                const removed = (await dispatch(api.sampleNextStepByStudy.removeList(sampleIDs, selectedStudy.id, step.order))).data
                                const samplesRemovedCount = removed.length
                                dispatch(notifySuccess({
                                    id: NOTIFICATION_KEY,
                                    title: "Samples dequeued from workflow",
                                    description: `Successfully dequeued ${samplesRemovedCount} samples from study ${selectedStudy.letter} (workflow "${workflow.name}") at step "${step.step_name}" for project "${selectedProject.name}."`,
                                }))
                                refresh()
                            } catch (error) {
                                dispatch(notifyError({
                                    id: NOTIFICATION_KEY,
                                    title: "Error dequeuing samples from workflow",
                                    description: `Failed to dequeue samples from study ${selectedStudy.letter} (workflow "${workflow.name}") at step "${step.step_name}" for project "${selectedProject.name}".`,
                                    duration: 10,
                                }))
                            }
                        } else if (actionName == "skip") {
                            try {
                                const sampleIDs = (await dispatch(fetchSamplesByDefaultSelectionAndExceptedIDs(
                                    defaultSelection,
                                    exceptedSampleIDs,
                                    serializeFilterParamsWithDescriptions(filters)
                                ))).map(sample => sample.id)
                                const skipCount = (await dispatch(api.sampleNextStepByStudy.skip(sampleIDs, selectedStudy.id, step.order))).data
                                dispatch(notifySuccess({
                                    id: NOTIFICATION_KEY,
                                    title: "Samples dequeued from workflow",
                                    description: `Successfully skipped ${skipCount} samples from study ${selectedStudy.letter} (workflow "${workflow.name}") at step "${step.step_name}" for project "${selectedProject.name}."`
                                }))
                                refresh()
                            } catch (error) {
                                dispatch(notifyError({
                                    id: NOTIFICATION_KEY,
                                    title: `Error skipping samples at step ${step.step_name} of study ${selectedStudy.letter} (${workflow.name}).`,
                                    description: error.data,
                                    duration: 10,
                                }))
                            }
                        } else if (actionName == "queue") {
                            try {
                                await dispatch(api.samples.addSamplesToStudy(exceptedSampleIDs, defaultSelection, selectedProject.id, selectedStudy.letter, step.order, serializeFilterParamsWithDescriptions(filters)))
                                dispatch(notifySuccess({
                                    id: NOTIFICATION_KEY,
                                    title: "Samples queued to workflow",
                                    description: `Successfully queued samples to study ${selectedStudy.letter} (workflow "${workflow.name}") at step "${step.step_name}" for project "${selectedProject.name}"`
                                }))
                                refresh()
                            } catch (error) {
                                const errors: string[] | undefined = error.data?.['add_sample_to_study']
                                dispatch(notifyError({
                                    id: NOTIFICATION_KEY,
                                    title: "Error queuing samples to workflow",
                                    description: errors ? `${errors[0]}${errors[0].endsWith('.') ? '' : '.'}${errors.length > 1 ? ' And ' + (errors.length - 1) + ' more errors...' : ''}` : `Could not queue samples to study ${selectedStudy.letter} (workflow "${workflow.name}") at step "${step.step_name}" for project "${selectedProject.name}".`,
                                    duration: 10,
                                }))
                            }
                        }
                    }}
                >
                    {step.order} - {step.step_name}
                </Button>
            )
        }
        return result
    }, [actionName, commonProjects, defaultSelection, dispatch, exceptedSampleIDs, filters, refresh, sampleCount, selectedProject, selectedStudy, studies, workflowByStudy])

    try {
        return <Flex vertical gap={"middle"}>{result}</Flex>
    } catch (error) {
        return <div>{`Error: ${error}`}</div>
    }
}
