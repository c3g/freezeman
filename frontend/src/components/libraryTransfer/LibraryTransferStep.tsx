import React, { useCallback, useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"
export interface sampleInfo {
    coordinate: string,
    type: string,
}
export interface cellSample {
    [id: string]: sampleInfo
}
export interface containerSample {
    containerName: string,
    rows: number,
    columns: number,
    samples: cellSample
}
const LibraryTransferStep = () => {

    const [sourceContainerSamples, setSourceContainerSample] = useState<containerSample[]>([{
        containerName: 'TestSourceContainer',
        rows: 8,
        columns: 12,
        samples: {
            '1': {
                coordinate: 'a_1', type: 'none'
            },
            '15': {
                coordinate: 'a_2', type: 'none'
            },
            '2': {
                coordinate: 'a_3', type: 'none'
            },
            '3': {
                coordinate: 'a_4', type: 'none'
            },
            '11': {
                coordinate: 'b_1', type: 'none'
            },
            '115': {
                coordinate: 'b_2', type: 'none'
            },
            '21': {
                coordinate: 'b_3', type: 'none'
            },
            '9': {
                coordinate: 'b_4', type: 'none'
            }
        },
    }, {
        containerName: 'TestSourceContainer2',
        rows: 8,
        columns: 12,
        samples: {
            '31': {
                coordinate: 'f_1', type: 'none'
            },
            '310': {
                coordinate: 'f_2', type: 'none'
            },
            '32': {
                coordinate: 'f_3', type: 'none'
            },
            '33': {
                coordinate: 'f_4', type: 'none'
            },
            '311': {
                coordinate: 'g_1', type: 'none'
            },
            '3115': {
                coordinate: 'g_2', type: 'none'
            },
            '321': {
                coordinate: 'g_3', type: 'none'
            },
            '331': {
                coordinate: 'g_4', type: 'none'
            }

        },
    },
    {
        containerName: 'TestSourceContainer3',
        rows: 8,
        columns: 12,
        samples: {

        }
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

        if (type == 'source')
            setIndex(length)
        else
            setDestinationIndex(length)

    }, [index, destinationIndex, destinationContainerSamples, sourceContainerSamples])

    const addContainer = useCallback(() => {
        const tempDestinationContainerSamples = [...destinationContainerSamples]
        const checkDestination = (name) => {
            let boolean: boolean = false;
            tempDestinationContainerSamples.forEach(container => {
                if (container.containerName == name) {
                    boolean = true
                }
            });
            return boolean
        }

        let newContainerName = 'NewDestinationContainer_1'
        while (checkDestination(newContainerName)) {
            let [name, number] = newContainerName.split('_')
            let num = Number(number) + 1
            newContainerName = name + '_' + num
        }

        tempDestinationContainerSamples.push({
            containerName: newContainerName,
            samples: {},
            rows: 8,
            columns: 12,
        })
        setDestinationContainerSamples(tempDestinationContainerSamples)
        setDestinationIndex(destinationIndex + 1)
    }, [destinationContainerSamples, destinationIndex])

    const saveChanges = useCallback((source, destination) => {
        const copyKeyObject = (obj) => {
            const copy = {}
            Object.keys(obj).forEach(key => copy[key] = { ...obj[key] })
            return copy
        }
        const setContainerSamples = (oldContainer, newContainer) => {
            oldContainer.forEach((obj: any) => {
                if (obj.containerName == newContainer.containerName) {
                    obj.samples = copyKeyObject(newContainer.samples)
                }
            })
            return oldContainer
        }

        setSourceContainerSample(setContainerSamples(sourceContainerSamples, source))
        setDestinationContainerSamples(setContainerSamples(destinationContainerSamples, destination))
    }, [sourceContainerSamples, destinationContainerSamples])

    //calls backend endpoint to fetch source containers with samples
    return (
        <LibraryTransfer
            sourceContainerSamples={{ ...sourceContainerSamples[index] }}
            destinationContainerSamples={{ ...destinationContainerSamples[destinationIndex] }}
            cycleContainer={changeContainer}
            saveChanges={saveChanges}
            addDestination={addContainer} />
    )
}
export default LibraryTransferStep