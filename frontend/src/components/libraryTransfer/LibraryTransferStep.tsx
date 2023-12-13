import React, { useCallback, useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"

const LibraryTransferStep = () => {

    const [sourceContainerSamples, setSourceContainerSample] = useState<any>([{
        containerName: 'TestSourceContainer',
        rows: 8,
        columns: 12,
        samples: {
            'a_1': { sampleID: 99, type: 'none' }, 'a_2': { sampleID: 20, type: 'none' }, 'a_3': { sampleID: 48, type: 'none' }, 'a_5': { sampleID: 44, type: 'none' },
            'b_1': { sampleID: 83, type: 'none' }, 'b_2': { sampleID: 815, type: 'none' }, 'b_3': { sampleID: 82, type: 'none' }, 'b_4': { sampleID: 5, type: 'none' },
            'c_1': { sampleID: 84, type: 'none' }, 'c_2': { sampleID: 814, type: 'none' }, 'c_3': { sampleID: 92, type: 'none' }, 'c_4': { sampleID: 4, type: 'none' },
            'd_1': { sampleID: 85, type: 'none' }, 'd_2': { sampleID: 813, type: 'none' }, 'd_3': { sampleID: 93, type: 'none' }, 'd_4': { sampleID: 3, type: 'none' },
            'e_1': { sampleID: 86, type: 'none' }, 'e_2': { sampleID: 812, type: 'none' }, 'e_3': { sampleID: 94, type: 'none' }, 'e_4': { sampleID: 2, type: 'none' },
            'f_1': { sampleID: 87, type: 'none' }, 'f_2': { sampleID: 811, type: 'none' }, 'f_3': { sampleID: 95, type: 'none' }, 'f_4': { sampleID: 1, type: 'none' },
        },
    }, {
        containerName: 'TestSourceContainer2',
        rows: 8,
        columns: 12,
        samples: {}
    },
    {
        containerName: 'TestSourceContainer3',
        rows: 8,
        columns: 12,
        samples: {}
    },
    {
        containerName: 'TestSourceContainer4',
        rows: 8,
        columns: 12,
        samples: {}
    }])
    const [destinationContainerSamples, setDestinationContainerSamples] = useState<any>([{
        containerName: 'NewContainer',
        rows: 8,
        columns: 12,
        samples: {}
    }])
    const [index, setIndex] = useState<number>(0)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    const changeContainer = useCallback((number: string, name: string, type: string) => {
        const tempIndex = type == 'source' ? index : destinationIndex;
        const tempContainerList = type == "source" ? sourceContainerSamples : destinationContainerSamples
        let length = tempIndex + parseFloat(number)

        if (length == -1)
            length = tempContainerList.length - 1

        if (!tempContainerList[length])
            length = 0

        if (type == 'source') {
            setIndex(length)
        } else {
            setDestinationIndex(length)
        }
    }, [index, destinationIndex, destinationContainerSamples, sourceContainerSamples])

    const addContainer = useCallback(() => {
        const tempDestinationContainerSamples = [...destinationContainerSamples]
        let newContainerName = 'NewDestinationContainer_1'
        const checkDestination = (name) => {
            let boolean: boolean = false;
            tempDestinationContainerSamples.forEach(container => {
                if (container.containerName == name) {
                    boolean = true
                }
            });
            return boolean
        }
        while (checkDestination(newContainerName)) {
            let [name, number] = newContainerName.split('_')
            let num = Number(number) + 1
            newContainerName = name + '_' + num
        }
        tempDestinationContainerSamples.push({ containerName: newContainerName, samples: {} })
        setDestinationContainerSamples(tempDestinationContainerSamples)
        setDestinationIndex(destinationIndex + 1)
    }, [destinationContainerSamples, destinationIndex])

    //calls backend endpoint to fetch source containers with samples
    return (
        <LibraryTransfer
            sourceContainerSamples={{ ...sourceContainerSamples[index] }}
            destinationContainerSamples={{ ...destinationContainerSamples[destinationIndex] }}
            cycleContainer={changeContainer}
            saveChanges={() => { }}
            addDestination={addContainer} />
    )
}
export default LibraryTransferStep