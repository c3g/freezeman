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
export const NONE_STRING = 'none'
export const PLACED_STRING = 'placed'
export const SELECTED_STRING = 'selected'
export const SOURCE_STRING = 'source'
export const DESTINATION_STRING = 'destination'
export const clear = (oldSamples: cellSample) => {
    const newSamples = {}
    Object.keys(oldSamples).forEach(id => {
        newSamples[id] = { ...oldSamples[id], type: oldSamples[id].type == SELECTED_STRING ? NONE_STRING : oldSamples[id].type }
    })
    return newSamples
}
const LibraryTransferStep = () => {

    const [sourceContainerSamples, setSourceContainerSample] = useState<containerSample[]>([{
        containerName: 'TestSourceContainer',
        rows: 8,
        columns: 12,
        samples: {
            '1': {
                coordinate: 'a_1', type: NONE_STRING
            },
            '15': {
                coordinate: 'a_2', type: NONE_STRING
            },
            '2': {
                coordinate: 'a_3', type: NONE_STRING
            },
            '3': {
                coordinate: 'a_4', type: NONE_STRING
            },
            '11': {
                coordinate: 'b_1', type: NONE_STRING
            },
            '115': {
                coordinate: 'b_2', type: NONE_STRING
            },
            '21': {
                coordinate: 'b_3', type: NONE_STRING
            },
            '9': {
                coordinate: 'b_4', type: NONE_STRING
            },
            '12': {
                coordinate: 'c_1', type: NONE_STRING
            },
            '116': {
                coordinate: 'c_2', type: NONE_STRING
            },
            '22': {
                coordinate: 'c_3', type: NONE_STRING
            },
            '10': {
                coordinate: 'c_4', type: NONE_STRING
            }
        },
    }, {
        containerName: 'TestSourceContainer2',
        rows: 8,
        columns: 12,
        samples: {
            '31': {
                coordinate: 'f_1', type: NONE_STRING
            },
            '310': {
                coordinate: 'f_2', type: NONE_STRING
            },
            '32': {
                coordinate: 'f_3', type: NONE_STRING
            },
            '33': {
                coordinate: 'f_4', type: NONE_STRING
            },
            '311': {
                coordinate: 'g_1', type: NONE_STRING
            },
            '3115': {
                coordinate: 'g_2', type: NONE_STRING
            },
            '321': {
                coordinate: 'g_3', type: NONE_STRING
            },
            '331': {
                coordinate: 'g_4', type: NONE_STRING
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

        const tempContainerList = type == SOURCE_STRING ? [...sourceContainerSamples] : [...destinationContainerSamples]
        let tempIndex = tempContainerList.findIndex(container => container.containerName == name)


        let length = tempIndex + parseFloat(number)

        if (length == -1)
            length = tempContainerList.length - 1

        if (length > tempContainerList.length - 1)
            length = 0


        if (length != tempIndex) {
            if (type == SOURCE_STRING) {
                setIndex(length)
            }
            else {
                setDestinationIndex(length)
            }
        }

    }, [destinationContainerSamples, sourceContainerSamples])

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
            sourceContainerSamples={sourceContainerSamples[index]}
            destinationContainerSamples={destinationContainerSamples[destinationIndex]}
            disableChangeSource={sourceContainerSamples.length == 1}
            disableChangeDestination={destinationContainerSamples.length == 1}
            cycleContainer={changeContainer}
            saveChanges={saveChanges}
            addDestination={addContainer} />
    )
}
export default LibraryTransferStep