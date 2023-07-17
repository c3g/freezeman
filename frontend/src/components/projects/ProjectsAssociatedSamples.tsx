import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSamplesByID, selectProjectSamplesTable } from "../../selectors";
import SamplesTableActions from '../../modules/projectSamplesTable/actions'
import { FilterSetting, createFixedFilter } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumn } from "../shared/WorkflowSamplesTable/SampleTableColumns";
import PagedItemsTable, { useFilteredColumns, useItemsByIDToDataObjects, usePagedItemsActionsCallbacks } from "../pagedItemsTable/PagedItemsTable"
import { Project, Protocol, Sample } from "../../models/frontend_models";
import api from '../../utils/api'

const lastProtocols = api.protocols.lastProtocols;

const useLastProtocols = (sampleIDs: readonly Sample['id'][]) => {
    const dispatch = useAppDispatch()
    const [lastProtocolBySampleID, setLastProtocolBySampleID] = useState<Record<Sample['id'], Protocol['name']>>({})

    useEffect(() => {
        (async () => {
            const response: { sample_result: Sample['id'], protocol: Protocol['name']}[] =
                sampleIDs.length > 0
                    ? (await dispatch(lastProtocols({ samples: sampleIDs.join(",")}))).data
                    : []
            setLastProtocolBySampleID(response.reduce((acc, { sample_result, protocol }) => {
                acc[sample_result] = protocol
                return acc
            }, {} as typeof lastProtocolBySampleID))
        })()
    }, [dispatch, sampleIDs])

    const LastProtocol = useCallback(({ sampleID }: { sampleID: Sample['id'] }) => {
        if (sampleID in lastProtocolBySampleID) {
            return <>{lastProtocolBySampleID[sampleID]}</>
        } else {
            return <>-</>
        }
    }, [lastProtocolBySampleID])

    return LastProtocol
}

export interface ProjectsAssociatedSamplesProps {
    projectID: Project['id']
}

export const ProjectsAssociatedSamples = ({ projectID } : ProjectsAssociatedSamplesProps) => {
    const projectIDFilter = useMemo(() => {
        const filterKey = 'derived_samples__project__id'
        const filter: FilterSetting = createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, filterKey, projectID.toString())
        return filter
    }, [projectID])

    const samplesTable = useAppSelector(selectProjectSamplesTable)

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)

    const LastProtocol = useLastProtocols(samplesTable.items)

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
        samplesTable.filters,
        samplesTableCallbacks.setFilterCallback,
        samplesTableCallbacks.setFilterOptionsCallback)

    const mapSamplesID = useItemsByIDToDataObjects(selectSamplesByID, (sample: Sample) => ({ sample }))

    return (
        // Don't render until the sample fixed filter is set, or you will get all of the projects.
        <PagedItemsTable<ObjectWithSample>
            getDataObjectsByID={mapSamplesID}
            pagedItems={samplesTable}
            columns={columns}
            usingFilters={true}
            {...samplesTableCallbacks}
            fixedFilter={projectIDFilter}
        />
    )
}

export default ProjectsAssociatedSamples;
