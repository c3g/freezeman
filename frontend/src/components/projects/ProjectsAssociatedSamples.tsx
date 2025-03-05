import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSamplesByID, selectProjectSamplesTable, selectStudiesByID } from "../../selectors"
import projectSamplesTableActions from '../../modules/projectSamplesTable/actions'
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumn } from "../samples/SampleTableColumns"
import PagedItemsTable, { PagedItemsTableProps } from "../pagedItemsTable/PagedItemsTable"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { Project, Protocol, Sample } from "../../models/frontend_models"
import api from '../../utils/api'
import { Button, Popover, Tag } from "antd";
import LinkSamplesToStudy from "./LinkSamplesToStudy";
import { FMSSampleNextStepByStudy, FMSStudy, WorkflowStepOrder } from "../../models/fms_api_models";
import { fetchStudies } from "../../modules/cache/cache";

const lastProtocols = api.protocols.lastProtocols;

function useLastProtocols(sampleIDs: readonly Sample['id'][]) {
    const dispatch = useAppDispatch()
    const [lastProtocolBySampleID, setLastProtocolBySampleID] = useState<Record<Sample['id'], Protocol['name']>>({})

    useEffect(() => {
        if (sampleIDs.length > 0) {
            dispatch(lastProtocols({ samples: sampleIDs.join(",") })).then(response => {
                setLastProtocolBySampleID(response.data.reduce((acc, { sample_result, protocol }) => {
                    acc[sample_result] = protocol
                    return acc
                }, {} as typeof lastProtocolBySampleID))
            })
        }
    }, [sampleIDs, dispatch])

    const LastProtocol = useCallback(({ sampleID }: { sampleID: Sample['id'] }) => {
        if (sampleID in lastProtocolBySampleID) {
            return <>{lastProtocolBySampleID[sampleID]}</>
        } else {
            return <></>
        }
    }, [lastProtocolBySampleID])

    return LastProtocol
}

function useStudySteps(sampleIDs: readonly Sample['id'][]) {
    const dispatch = useAppDispatch()
    const [studiesByID, setStudiesByID] = useState<Record<FMSStudy['id'], FMSStudy['letter'] | undefined>>({})
    const [studyStepsBySampleID, setStudyStepsBySampleID] = useState<Record<Sample['id'], FMSSampleNextStepByStudy[] | undefined>>({})
    const [stepOrderByStepOrderID, setStepOrderByStepOrderID] = useState<Record<WorkflowStepOrder['id'], WorkflowStepOrder | undefined>>({})

    const refresh = useCallback(async (sampleIDs: readonly Sample['id'][]) => {
        const sampleNextStepByStudies = (await dispatch(api.sampleNextStepByStudy.getStudySamples({ sample_next_step__sample__id__in: sampleIDs.join(",") }))).data.results

        const studyStepsBySampleID: Record<Sample['id'], FMSSampleNextStepByStudy[] | undefined> = {}
        for (const sampleNextStepByStudy of sampleNextStepByStudies) {
            let studySteps = studyStepsBySampleID[sampleNextStepByStudy.sample]
            if (!studySteps) {
                studySteps = []
            }
            if (!studySteps.find((s) => s.study === sampleNextStepByStudy.study && s.step_order === sampleNextStepByStudy.step_order && s.sample === sampleNextStepByStudy.sample)) {
                studySteps.push(sampleNextStepByStudy)
            }
            studyStepsBySampleID[sampleNextStepByStudy.sample] = studySteps
        }
        setStudyStepsBySampleID((old) => ({ ...old, ...studyStepsBySampleID }))

        const studyIDs = new Set<number>()
        for (const sampleID in studyStepsBySampleID) {
            for (const studyStep of studyStepsBySampleID[sampleID] ?? []) {
                studyIDs.add(studyStep.study)
            }
        }
        const studies: FMSStudy[] = []
        if (studyIDs.size > 0) {
            studies.push(...await fetchStudies(Array.from(studyIDs)))
        }
        const studiesByID: Record<FMSStudy['id'], FMSStudy['letter'] | undefined> = {}
        for (const study of studies) {
            studiesByID[study.id] = study.letter
        }
        setStudiesByID((old) => ({ ...old, ...studiesByID }) )

        const orderByStepOrder: Record<number, WorkflowStepOrder | undefined> = {}
        for (const study of studies) {
            if (study) {
                const workflow = (await dispatch(api.workflows.get(study.workflow_id))).data
                for (const stepOrder of workflow.steps_order) {
                    orderByStepOrder[stepOrder.id] = stepOrder
                }
            }
        }
        setStepOrderByStepOrderID((old) => ({ ...old, ...orderByStepOrder }))
    }, [dispatch])

    useEffect(() => {
        if (sampleIDs.length > 0) {
            refresh(sampleIDs)
        }
    }, [refresh, sampleIDs])

    const StudySteps = useCallback(({ sampleID }: { sampleID: Sample['id'] }) => {
        if (sampleID in studyStepsBySampleID) {
            const tags = studyStepsBySampleID[sampleID]
                ?.sort((a, b) => {
                    const ALetter = studiesByID[a.study]
                    const AStepOrder = stepOrderByStepOrderID[a.step_order]

                    const BLetter = studiesByID[b.study]
                    const BStepOrder = stepOrderByStepOrderID[b.step_order]

                    if (ALetter && AStepOrder && BLetter && BStepOrder) {
                        if (ALetter === BLetter) {
                            return AStepOrder.order - BStepOrder.order
                        } else {
                            return ALetter.localeCompare(BLetter)
                        }
                    } else {
                        return 0
                    }
                })
                ?.reduce<ReactElement[]>((tags, studyStep) => {
                    const studyLetter = studiesByID[studyStep.study]
                    const stepOrder = stepOrderByStepOrderID[studyStep.step_order]
                    if (studyLetter && stepOrder) {
                        tags.push(
                            <Popover
                                key={studyStep.id}
                                content={
                                    <>
                                        <div>
                                            Study: {studyLetter}
                                        </div>
                                        <div>
                                            Step: {stepOrder.step_name}
                                        </div>
                                    </>
                                }
                                destroyTooltipOnHide
                            >
                                <Tag>{studyLetter}-{stepOrder.order}</Tag>
                            </Popover>
                        )
                    } else {
                        tags.push(<span key={studyStep.id}>...</span>)
                    }
                    return tags
                }, [])
                ?? []
            return tags
        } else {
            return []
        }
    }, [stepOrderByStepOrderID, studiesByID, studyStepsBySampleID])

    return [StudySteps, refresh] as const
}

export interface ProjectsAssociatedSamplesProps {
    projectID: Project['id']
}

export const ProjectsAssociatedSamples = ({ projectID: currentProjectID }: ProjectsAssociatedSamplesProps) => {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(projectSamplesTableActions.setProject(currentProjectID))
    }, [currentProjectID, dispatch])

    const projectSamplesTable = useAppSelector(selectProjectSamplesTable)
    const { pagedItems } = projectSamplesTable

    const projectSamplesTableCallbacks = usePagedItemsActionsCallbacks(projectSamplesTableActions)

    const LastProtocol = useLastProtocols(pagedItems.items)
    const [StudySteps, refreshStudySteps] = useStudySteps(pagedItems.items)

    const sampleColumns: SampleColumn[] = useMemo(() => [
        SAMPLE_COLUMN_DEFINITIONS.KIND,
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
        SAMPLE_COLUMN_DEFINITIONS.COORDINATES,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_CONTAINER,
        SAMPLE_COLUMN_DEFINITIONS.COHORT,
        SAMPLE_COLUMN_DEFINITIONS.VOLUME,
        SAMPLE_COLUMN_DEFINITIONS.CREATION_DATE,
        SAMPLE_COLUMN_DEFINITIONS.DEPLETED,
        {
            columnID: 'CURRENT_STUDY_STEP',
            title: 'Current Study-Step',
            dataIndex: ['sample', 'id'],
            width: 160,
            render : (_, { sample }) =>
                sample && <StudySteps sampleID={sample.id} />,
        },
        {
            columnID: 'LAST_PROTOCOL',
            title: 'Last Protocol',
            dataIndex: ['sample', 'id'],
            width: 200,
            render: (_, { sample }) =>
                sample && <LastProtocol sampleID={sample.id} />,
        }
    ], [LastProtocol, StudySteps])

    const columns = useFilteredColumns<ObjectWithSample>(
        sampleColumns,
        SAMPLE_COLUMN_FILTERS,
        SAMPLE_FILTER_KEYS,
        pagedItems.filters,
        projectSamplesTableCallbacks.setFilterCallback,
        projectSamplesTableCallbacks.setFilterOptionsCallback)

    const mapSamplesID = useItemsByIDToDataObjects(selectSamplesByID, (sample: Sample) => ({ sample }))

    const [defaultSelection, setDefaultSelection] = useState(false)
    const [exceptedSampleIDs, setExceptedSampleIDs] = useState<Sample['id'][]>([])
    const [linkSamplesToStudyOpen, setLinkSamplesToStudyOpen] = useState(false)

    const sampleCount = defaultSelection ? pagedItems.totalCount - exceptedSampleIDs.length : exceptedSampleIDs.length

    const filters = useMemo(() => ({ ...pagedItems.fixedFilters, ...pagedItems.filters }), [pagedItems.filters, pagedItems.fixedFilters])

    const selection: NonNullable<PagedItemsTableProps<ObjectWithSample>['selection']> = useMemo(() => ({
        onSelectionChanged: (selectedItems, selectAll) => {
            setExceptedSampleIDs(selectedItems.map(id => parseInt(id as string)))
            setDefaultSelection(selectAll)
        }
    }), [])

    return (
        <>
            <LinkSamplesToStudy
                open={linkSamplesToStudyOpen}
                defaultSelection={defaultSelection}
                exceptedSampleIDs={exceptedSampleIDs}
                totalCount={pagedItems.totalCount}
                projectID={currentProjectID}
                filters={filters}
                handleOk={() => setLinkSamplesToStudyOpen(false)}
                handleCancel={() => setLinkSamplesToStudyOpen(false)}
                handleSuccess={() => refreshStudySteps(pagedItems.items)}
            />
            <PagedItemsTable<ObjectWithSample>
                getDataObjectsByID={mapSamplesID}
                pagedItems={pagedItems}
                columns={columns}
                usingFilters={true}
                {...projectSamplesTableCallbacks}
                initialLoad={false}
                selection={selection}
                topBarExtra={[
                    <Button
                        disabled={sampleCount === 0}
                        key={0}
                        onClick={() => setLinkSamplesToStudyOpen(true)}
                    >
                        Link to Study
                    </Button>,
                ]}
            />
        </>
    )
}

export default ProjectsAssociatedSamples;
