import React, { useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"

const LibraryTransferStep = () => {

    const [sourceContainerSamples, setSourceContainerSample] = useState<any>([{ containerName: 'test', samples: { 'a_1': { sampleID: 99, type: 'none' }, 'a_2': { sampleID: 2, type: 'none' }, 'a_3': { sampleID: 48, type: 'none' }, 'a_5': { sampleID: 44, type: 'none' }, 'b_1': { sampleID: 8, type: 'none' }, 'b_2': { sampleID: 81, type: 'none' }, 'b_3': { sampleID: 82, type: 'none' }, 'b_4': { sampleID: 83, type: 'none' }, } }])
    const [destinationContainerSamples, setDestinationContainerSamples] = useState<any>()
    const [index, setIndex] = useState<any>(0)
    useEffect(() => {
        // setSourceContainerSample(sourceContainerSamples)
    }, [])

    //calls backend endpoint to fetch source containers with samples
    return (
        <LibraryTransfer
            sourceContainerSamples={sourceContainerSamples[index].samples}
            sourceContainerName={sourceContainerSamples[index].containerName}
            destinationContainerSamples={{}}
            updateContainerSamples={() => { }} />
    )
}
export default LibraryTransferStep