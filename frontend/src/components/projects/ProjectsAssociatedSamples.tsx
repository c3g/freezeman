import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSamplesByID, selectProjectSamplesTable, selectProtocolsByID } from "../../selectors";
import SamplesTableActions from '../../modules/projectSamplesTable/actions'
import { FilterSetting, createFixedFilter } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS, SampleColumn } from "../shared/WorkflowSamplesTable/SampleTableColumns";
import PagedItemsTable, { useFilteredColumns, useItemsByIDToDataObjects, usePagedItemsActionsCallbacks } from "../pagedItemsTable/PagedItemsTable"
import { ProcessMeasurement, Protocol, Sample } from "../../models/frontend_models";
import api from '../../utils/api'

const listProcessMeasurements = api.processMeasurements.list;

interface WithLastProtocolProps {
    sampleID: Sample['id']
}
const WithLastProtocol = ({ sampleID }: WithLastProtocolProps) => {
    const dispatch = useAppDispatch()
    const protocolsByID = useAppSelector(selectProtocolsByID)
    
    const [lastProtocol, setLastProtocol] = useState<string | undefined>()

    useEffect(() => {
        (async () => {
            const response = await dispatch(listProcessMeasurements({ lineage__child__id: `${sampleID}` }))
            console.debug(response)
            const processMeasurement: ProcessMeasurement = response.data.results[0]
            setLastProtocol(protocolsByID[processMeasurement.protocol].name)
        })()
    }, [dispatch, protocolsByID, sampleID])

    return <>{lastProtocol}</>
}

const ProjectsAssociatedSamples = ({
    projectID
}) => {
    const projectIDFilter = useMemo(() => {
        const filterKey = 'derived_samples__project__id'
        const filter: FilterSetting = createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, filterKey, projectID)
        return filter
    }, [projectID])

    const samplesTable = useAppSelector(selectProjectSamplesTable)

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)

    const sampleColumns = [
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
                sample && <WithLastProtocol sampleID={sample.id} />,
        } as SampleColumn
    ]

    const columns = useFilteredColumns<ObjectWithSample>(
        sampleColumns,
        SAMPLE_COLUMN_FILTERS,
        SAMPLE_NEXT_STEP_FILTER_KEYS,
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
