import React, { useCallback, useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"

const LibraryTransferStep = () => {

    const [sourceContainerSamples, setSourceContainerSample] = useState<any>([{
        containerName: 'TestSourceContainer', samples: {
            'a_1': { sampleID: 99, type: 'none' }, 'a_2': { sampleID: 20, type: 'none' }, 'a_3': { sampleID: 48, type: 'none' }, 'a_5': { sampleID: 44, type: 'none' },
            'b_1': { sampleID: 83, type: 'none' }, 'b_2': { sampleID: 815, type: 'none' }, 'b_3': { sampleID: 82, type: 'none' }, 'b_4': { sampleID: 5, type: 'none' },
            'c_1': { sampleID: 84, type: 'none' }, 'c_2': { sampleID: 814, type: 'none' }, 'c_3': { sampleID: 92, type: 'none' }, 'c_4': { sampleID: 4, type: 'none' },
            'd_1': { sampleID: 85, type: 'none' }, 'd_2': { sampleID: 813, type: 'none' }, 'd_3': { sampleID: 93, type: 'none' }, 'd_4': { sampleID: 3, type: 'none' },
            'e_1': { sampleID: 86, type: 'none' }, 'e_2': { sampleID: 812, type: 'none' }, 'e_3': { sampleID: 94, type: 'none' }, 'e_4': { sampleID: 2, type: 'none' },
            'f_1': { sampleID: 87, type: 'none' }, 'f_2': { sampleID: 811, type: 'none' }, 'f_3': { sampleID: 95, type: 'none' }, 'f_4': { sampleID: 1, type: 'none' },
        }
    }, { containerName: 'Next', samples: {} }])
    const [destinationContainerSamples, setDestinationContainerSamples] = useState<any>([{ containerName: 'NewContainer', samples: {} }])
    const [index, setIndex] = useState<number>(0)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    const changeContainer = useCallback((number: number, name: string, type: string) => {
        let length = number;
        if (type == 'source') {
            length += index
            if (sourceContainerSamples[length])
                setIndex(length)
        } else {
            length += destinationIndex
            if (destinationContainerSamples[length])
                setDestinationIndex(length)
        }
    }, [index, destinationIndex])

    //calls backend endpoint to fetch source containers with samples
    return (
        <LibraryTransfer
            sourceContainerSamples={sourceContainerSamples[index]}
            destinationContainerSamples={destinationContainerSamples[destinationIndex]}
            updateContainerSamples={() => { }}
            cycleContainer={changeContainer} />
    )
}
export default LibraryTransferStep