import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSamplesByID, selectProjectSamplesTable, selectStudiesByID, selectStudySamplesByID } from "../../selectors"
import projectSamplesTableActions from '../../modules/projectSamplesTable/actions'
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumn } from "../samples/SampleTableColumns"
import PagedItemsTable, { PagedItemTableSelection } from "../pagedItemsTable/PagedItemsTable"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { Project, Protocol, Sample } from "../../models/frontend_models"
import api from '../../utils/api'
import { Button } from "antd";
import LinkSamplesToStudy from "./LinkSamplesToStudy";
import { FMSSampleNextStepByStudy } from "../../models/fms_api_models";
import { list as listStudies } from "../../modules/studies/actions";

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
    const studiesByID = useAppSelector(selectStudiesByID)
    const [studyStepsBySampleID, setStudyStepsBySampleID] = useState<Record<Sample['id'], FMSSampleNextStepByStudy[] | undefined>>({})
    const [orderByStepOrder, setOrderByStepOrder] = useState<Record<number, number | undefined>>({})

    useEffect(() => {
        if (sampleIDs.length > 0) {
            dispatch(api.sampleNextStepByStudy.getStudySamples({ sample_next_step__sample__id__in: sampleIDs.join(",") })).then((response) => {
                setStudyStepsBySampleID(response.data.results.reduce((studyStepsBySampleID, sampleNextStepByStudy) => {
                    let studySteps = studyStepsBySampleID[sampleNextStepByStudy.sample]
                    if (!studySteps) {
                        studySteps = []
                    }
                    if (!studySteps.find((s) => s.study === sampleNextStepByStudy.study && s.step_order === sampleNextStepByStudy.step_order && s.sample === sampleNextStepByStudy.sample)) {
                        studySteps.push(sampleNextStepByStudy)
                    }
                    studyStepsBySampleID[sampleNextStepByStudy.sample] = studySteps
                    return studyStepsBySampleID
                }, studyStepsBySampleID))
            })
        }
    }, [dispatch, sampleIDs, studyStepsBySampleID])
    useEffect(() => {
        const studyIDs = new Set<number>()
        for (const sampleID in studyStepsBySampleID) {
            studyStepsBySampleID[sampleID]?.forEach((studyStep) => studyIDs.add(studyStep.study))
        }
        if (studyIDs.size > 0) {
            dispatch(listStudies({ id__in: Array.from(studyIDs).join(",") }))
        }
    }, [dispatch, studyStepsBySampleID])
    useEffect(() => {
        for (const studyID in studiesByID) {
            const study = studiesByID[studyID]
            if (study) {
                dispatch(api.workflows.get(study.workflow_id)).then(response => {
                    setOrderByStepOrder(response.data.steps_order.reduce((acc, stepOrder) => {
                        acc[stepOrder.id] = stepOrder.order
                        return acc
                    }, orderByStepOrder))
                })
            }
        }
    }, [dispatch, orderByStepOrder, studiesByID])

    const StudySteps = useCallback(({ sampleID }: { sampleID: Sample['id'] }) => {
        if (sampleID in studyStepsBySampleID) {
            return <>{studyStepsBySampleID[sampleID]?.map((studyStep) => `${studiesByID[studyStep.study]?.letter}-${orderByStepOrder[studyStep.step_order]}`).join(", ")}</>
        } else {
            return <></>
        }
    }, [orderByStepOrder, studiesByID, studyStepsBySampleID])

    return StudySteps
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
    const StudySteps = useStudySteps(pagedItems.items)

    const sampleColumns: SampleColumn[] = useMemo(() => [
        SAMPLE_COLUMN_DEFINITIONS.KIND,
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.COHORT,
        SAMPLE_COLUMN_DEFINITIONS.VOLUME,
        SAMPLE_COLUMN_DEFINITIONS.CREATION_DATE,
        SAMPLE_COLUMN_DEFINITIONS.DEPLETED,
        {
            columnID: 'STUDY-STEP',
            title: 'Study - Step',
            dataIndex: ['sample', 'id'],
            render : (_, { sample }) =>
                sample && <StudySteps sampleID={sample.id} />,
        },
        {
            columnID: 'LAST_PROTOCOL',
            title: 'Last Protocol',
            dataIndex: ['sample', 'id'],
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

    const [selectAll, setSelectAll] = useState(false)
    const [sampleIDs, setSampleIDs] = useState<Sample['id'][]>([])
    const [linkSamplesToStudyOpen, setLinkSamplesToStudyOpen] = useState(false)

    return (
        <>
            <LinkSamplesToStudy
                open={linkSamplesToStudyOpen}
                selectAll={selectAll}
                selectedItemIDs={sampleIDs}
                totalCount={pagedItems.totalCount}
                projectID={currentProjectID}
                handleOk={() => setLinkSamplesToStudyOpen(false)}
                handleCancel={() => setLinkSamplesToStudyOpen(false)}
            />
            <PagedItemsTable<ObjectWithSample>
                getDataObjectsByID={mapSamplesID}
                pagedItems={pagedItems}
                columns={columns}
                usingFilters={true}
                {...projectSamplesTableCallbacks}
                initialLoad={false}
                selection={{
                    onSelectionChanged: (selectedItems, selectAll) => {
                        setSampleIDs(selectedItems.map(id => parseInt(id as string)))
                        setSelectAll(selectAll)
                    }
                }}
                topBarExtra={[
                    <Button
                        disabled={(selectAll ? pagedItems.totalCount - sampleIDs.length : sampleIDs.length) === 0}
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
