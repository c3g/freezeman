import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSamplesByID, selectProjectSamplesTable } from "../../selectors"
import projectSamplesTableActions from '../../modules/projectSamplesTable/actions'
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumn } from "../samples/SampleTableColumns"
import PagedItemsTable, { PagedItemTableSelection } from "../pagedItemsTable/PagedItemsTable"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { Project, Protocol, Sample } from "../../models/frontend_models"
import api from '../../utils/api'
import { Button } from "antd";
import LinkSamplesToStudy, { LinkSamplesToStudyProps } from "./LinkSamplesToStudy";
import { TableRowSelection } from "antd/lib/table/interface";

const lastProtocols = api.protocols.lastProtocols;

function useLastProtocols(sampleIDs: readonly Sample['id'][]) {
    const [lastProtocolBySampleID, setLastProtocolBySampleID] = useState<Record<Sample['id'], Protocol['name']>>({})
    const dispatch = useAppDispatch()

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

export interface ProjectsAssociatedSamplesProps {
    projectID: Project['id']
}

export const ProjectsAssociatedSamples = ({ projectID: currentProjectID } : ProjectsAssociatedSamplesProps) => {
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(projectSamplesTableActions.setProject(currentProjectID))
    }, [currentProjectID, dispatch])
    
    const projectSamplesTable = useAppSelector(selectProjectSamplesTable)
    const { pagedItems } = projectSamplesTable

    const [selectedItems, setSelectedItems] = useState<LinkSamplesToStudyProps['selectedItems']>({
        sample_ids: [],
        project_id: currentProjectID
    })

    const projectSamplesTableCallbacks = usePagedItemsActionsCallbacks(projectSamplesTableActions)

    const LastProtocol = useLastProtocols(pagedItems.items)

    const sampleColumns: SampleColumn[] = useMemo(() => [
        SAMPLE_COLUMN_DEFINITIONS.KIND,
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.COHORT,
        SAMPLE_COLUMN_DEFINITIONS.VOLUME,
        SAMPLE_COLUMN_DEFINITIONS.CREATION_DATE,
        SAMPLE_COLUMN_DEFINITIONS.DEPLETED,
        {
            columnID: 'LAST_PROTOCOL',
            title: 'Last Protocol',
            dataIndex: ['sample', 'id'],
            render: (_, { sample }) =>
                sample && <LastProtocol sampleID={sample.id} />,
        }
    ], [LastProtocol])

    const columns = useFilteredColumns<ObjectWithSample>(
        sampleColumns,
        SAMPLE_COLUMN_FILTERS,
        SAMPLE_FILTER_KEYS,
        pagedItems.filters,
        projectSamplesTableCallbacks.setFilterCallback,
        projectSamplesTableCallbacks.setFilterOptionsCallback)

    const mapSamplesID = useItemsByIDToDataObjects(selectSamplesByID, (sample: Sample) => ({ sample }))

    const [linkSamplesToStudyOpen, setLinkSamplesToStudyOpen] = useState(false)

    const onChange: NonNullable<TableRowSelection<ObjectWithSample>['onChange']> = useCallback((selectedRowKeys, selectedRows, info) => {
        if (info.type === 'all') {

        }
    }, [])

    return (
        <>
            <LinkSamplesToStudy
                open={linkSamplesToStudyOpen}
                selectedItemIDs={selectedItems}
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
                selection={selection}
                topBarExtra={[
                    <Button disabled={selectedItems.length === 0} key={0} onClick={() => setLinkSamplesToStudyOpen(true)}>Link to Study</Button>,
                ]}
            />
        </>
    )
}

export default ProjectsAssociatedSamples;
