import React, { useEffect, useMemo, useState } from "react"
import { FMSSample } from "../../models/fms_api_models"
import { SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS } from '../shared/WorkflowSamplesTable/SampleTableColumns';
import WorkflowSamplesTable from "../shared/WorkflowSamplesTable/WorkflowSamplesTable"
import { PagedItems } from "../../models/paged_items";

interface IndividualAssociatedSamplesProps {
    samples: number[]
}

const IndividualAssociatedSamples = ({ samples }: IndividualAssociatedSamplesProps) => {
    // const [samplesData, setSamplesState] = useState<any>([]);
    useEffect(() => {
    }, [])

    const columnsForSelection = useMemo(() => {
        const columns = [
            SAMPLE_COLUMNS.ID,
            SAMPLE_COLUMNS.KIND,
            SAMPLE_COLUMNS.NAME,
            SAMPLE_COLUMNS.PROJECT,
            SAMPLE_COLUMNS.CONTAINER_BARCODE,
            SAMPLE_COLUMNS.COORDINATES,
            SAMPLE_COLUMNS.VOLUME,
            SAMPLE_COLUMNS.CONCENTRATION,
            SAMPLE_COLUMNS.QC_FLAG,
            SAMPLE_COLUMNS.CREATION_DATE,
            SAMPLE_COLUMNS.DEPLETED
        ]
        // Make the Coordinates column sortable. We have to force the sorter to appear since
        // the selection table doesn't use column filters - otherwise, WorkflowSamplesTable would
        // take care of setting the column sortable.
        return columns
    }, [samples])
    return <>
        <WorkflowSamplesTable
            hasFilter={false}
            sampleIDs={samples ? samples : []}
            columns={columnsForSelection}
            setSortBy={() => { }}
        />
    </>
}

export default IndividualAssociatedSamples