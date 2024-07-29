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
import store from "../../store";
import { Button } from "antd";

const lastProtocols = api.protocols.lastProtocols;

function useLastProtocols(sampleIDs: readonly Sample['id'][]) {
    const [lastProtocolBySampleID, setLastProtocolBySampleID] = useState<Record<Sample['id'], Protocol['name']>>({})

    useEffect(() => {
        (async () => {
            const response: { sample_result: Sample['id'], protocol: Protocol['name']}[] =
                sampleIDs.length > 0
                    ? (await store.dispatch(lastProtocols({ samples: sampleIDs.join(",")}))).data
                    : []
            setLastProtocolBySampleID(response.reduce((acc, { sample_result, protocol }) => {
                acc[sample_result] = protocol
                return acc
            }, {} as typeof lastProtocolBySampleID))
        })()
    }, [sampleIDs])

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
    useEffect(() => {
        store.dispatch(projectSamplesTableActions.setProject(currentProjectID))
    }, [currentProjectID])
    
    const projectSamplesTable = useAppSelector(selectProjectSamplesTable)
    const { pagedItems } = projectSamplesTable

    const [selectedItemIDs, setSelectedItemIDs] = useState<PagedItemTableSelection<ObjectWithSample>['selectedItemIDs']>([])
    const selection = useMemo(() =>
        ({
            selectedItemIDs,
            onSelectionChanged(items) {
                setSelectedItemIDs(items.map(({ sample }) => sample?.id as number)) // sample id should never be undefined when selected
            }
        } as PagedItemTableSelection<ObjectWithSample>),
        [selectedItemIDs]
    )

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

    return (
        // Don't render until the sample fixed filter is set, or you will get all of the projects.
        <PagedItemsTable<ObjectWithSample>
            getDataObjectsByID={mapSamplesID}
            pagedItems={pagedItems}
            columns={columns}
            usingFilters={true}
            {...projectSamplesTableCallbacks}
            initialLoad={false}
            selection={selection}
            topBarExtra={[
                <Button disabled={selectedItemIDs.length === 0} key={0}>Link to Study</Button>,
            ]}
        />
    )
}

export default ProjectsAssociatedSamples;
