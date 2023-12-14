import React, { useCallback, useEffect, useState } from "react"
import WorkflowSamplesTable from "../WorkflowSamplesTable/WorkflowSamplesTable"
import { SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS } from '../samples/SampleTableColumns'
interface LibraryTransferTableProps {
    samples: any,
    onSampleSelect: (sample) => void
}
const LibraryTransferTable = ({ samples, onSampleSelect }: LibraryTransferTableProps) => {
    const [selectedIds, setSelectedIds] = useState<any>([])
    useEffect(() => {
        const ids = samples.map(sample => {
            if (sample.sample.type == 'selected') {
                return sample.sample.id
            }
        })
        if (ids)
            setSelectedIds(ids)
    }, [samples])

    const selectionProps = {
        selectedSampleIDs: selectedIds,
        clearAllSamples: () => { },
        onSelectionChanged: onSampleSelect,
    }

    return (<WorkflowSamplesTable
        hasFilter={false}
        samples={samples}
        columns={[SAMPLE_COLUMNS.ID, SAMPLE_COLUMNS.CONTAINER_BARCODE]}
        selection={selectionProps}
    />)
}
export default LibraryTransferTable