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
        const reverse = selectedSamples.reverse()
        samples.sort((a, b) => {
            return reverse.indexOf(b.sample.id) - reverse.indexOf(a.sample.id);
        })
        setSortedSamples(samples)
    }, [samples, selectedSamples])

    const selectionProps = {
        selectedSampleIDs: selectedSamples,
        clearAllSamples: () => { },
        onSelectionChanged: onSampleSelect,
    }

    return (<WorkflowSamplesTable
        hasFilter={false}
        samples={sortedSamples}
        columns={[SAMPLE_COLUMNS.ID, SAMPLE_COLUMNS.NAME]}
        selection={selectionProps}
    />)
}
export default LibraryTransferTable