import React, { useCallback, useEffect, useState } from "react"
import WorkflowSamplesTable from "../WorkflowSamplesTable/WorkflowSamplesTable"
import { SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS } from '../samples/SampleTableColumns'
interface LibraryTransferTableProps {
    samples: any,
    onSampleSelect: (sample) => void,
    selectedSamples: any
}
const LibraryTransferTable = ({ samples, onSampleSelect, selectedSamples }: LibraryTransferTableProps) => {
    const [sortedSamples, setSortedSamples] = useState<any>([])
    useEffect(() => {

        samples.sort((a, b) => {
            if (a.sample.type > b.sample.type) {
                return -1;
            }
            if (a.sample.type < b.sample.type) {
                return 1;
            }
            return 0;
        }).filter

        setSortedSamples(samples)
    }, [samples])

    const selectionProps = {
        selectedSampleIDs: selectedSamples,
        clearAllSamples: () => { },
        onSelectionChanged: onSampleSelect,
    }

    return (<WorkflowSamplesTable
        hasFilter={false}
        samples={sortedSamples}
        columns={[SAMPLE_COLUMNS.ID, SAMPLE_COLUMNS.CONTAINER_BARCODE]}
        selection={selectionProps}
    />)
}
export default LibraryTransferTable