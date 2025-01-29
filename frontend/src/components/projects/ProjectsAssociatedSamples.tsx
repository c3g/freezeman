import React, { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector, useLastProtocols, useStudySteps } from "../../hooks";
import { selectSamplesByID, selectProjectSamplesTable } from "../../selectors"
import projectSamplesTableActions from '../../modules/projectSamplesTable/actions'
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumn } from "../samples/SampleTableColumns"
import PagedItemsTable, { PagedItemsTableProps } from "../pagedItemsTable/PagedItemsTable"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { Project, Sample } from "../../models/frontend_models"
import { Button } from "antd";
import LinkSamplesToStudy from "./LinkSamplesToStudy";

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
