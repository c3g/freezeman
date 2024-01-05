import React, { useCallback, useReducer, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"
export interface sampleInfo {
    coordinate: string,
    type: string,
    name: string,
    sourceContainer?: string
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
export const PATTERN_STRING = 'pattern'
const LibraryTransferStep = () => {

    const [sourceContainerSamples, setSourceContainerSample] = useState<containerSample[]>([{
        containerName: 'TestSourceContainer',
        rows: 8,
        columns: 12,
        samples: {
            '1': {
                coordinate: 'a_1', type: NONE_STRING, name: 'sample_1'
            },
            '15': {
                coordinate: 'a_2', type: NONE_STRING, name: 'sample_15'
            },
            '2': {
                coordinate: 'a_3', type: NONE_STRING, name: 'sample_2'
            },
            '3': {
                coordinate: 'a_4', type: NONE_STRING, name: 'sample_3'
            },
            '11': {
                coordinate: 'b_1', type: NONE_STRING, name: 'sample_11'
            },
            '115': {
                coordinate: 'b_2', type: NONE_STRING, name: 'sample_115'
            },
            '21': {
                coordinate: 'b_3', type: NONE_STRING, name: 'sample_21'
            },
            '9': {
                coordinate: 'b_4', type: NONE_STRING, name: 'sample_9'
            },
            '12': {
                coordinate: 'c_1', type: NONE_STRING, name: 'sample_12'
            },
            '116': {
                coordinate: 'c_2', type: NONE_STRING, name: 'sample_116'
            },
            '22': {
                coordinate: 'c_3', type: NONE_STRING, name: 'sample_22'
            },
            '10': {
                coordinate: 'c_4', type: NONE_STRING, name: 'sample_10'
            }
        },
    }, {
        containerName: 'TestSourceContainer2',
        rows: 8,
        columns: 12,
        samples: {
            '31': {
                coordinate: 'f_1', type: NONE_STRING, name: 'sample_31'
            },
            '310': {
                coordinate: 'f_2', type: NONE_STRING, name: 'sample_310'
            },
            '32': {
                coordinate: 'f_3', type: NONE_STRING, name: 'sample_32'
            },
            '33': {
                coordinate: 'f_4', type: NONE_STRING, name: 'sample_33'
            },
            '311': {
                coordinate: 'g_1', type: NONE_STRING, name: 'sample_311'
            },
            '3115': {
                coordinate: 'g_2', type: NONE_STRING, name: 'sample_3115'
            },
            '321': {
                coordinate: 'g_3', type: NONE_STRING, name: 'sample_321'
            },
            '331': {
                coordinate: 'g_4', type: NONE_STRING, name: 'sample_331'
            }
        },
    },
    {
        containerName: 'TestSourceContainer3',
        rows: 8,
        columns: 12,
        samples: {
            '600': {
                coordinate: 'a_8', type: NONE_STRING, name: 'sample_31'
            },
            '601': {
                coordinate: 'a_9', type: NONE_STRING, name: 'sample_310'
            },
            '602': {
                coordinate: 'a_10', type: NONE_STRING, name: 'sample_32'
            },
            '603': {
                coordinate: 'b_8', type: NONE_STRING, name: 'sample_33'
            },
            '604': {
                coordinate: 'b_9', type: NONE_STRING, name: 'sample_311'
            },
            '605': {
                coordinate: 'b_10', type: NONE_STRING, name: 'sample_3115'
            },
            '606': {
                coordinate: 'c_8', type: NONE_STRING, name: 'sample_321'
            },
            '607': {
                coordinate: 'c_9', type: NONE_STRING, name: 'sample_331'
            }
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

    const copyKeyObject = useCallback((obj) => {
        const copy = {}
        Object.keys(obj).forEach(key => copy[key] = { ...obj[key] })
        return copy
    }, [])

    const copyContainerArray = useCallback((containerArray) => {
        return containerArray.map(obj => {
            return {
                columns: obj.columns,
                rows: obj.rows,
                containerName: obj.containerName,
                samples: copyKeyObject(obj.samples)
            }
        })
    }, [])

    const setContainerSamples = (oldContainer, newContainer) => {
        oldContainer.forEach((obj: any) => {
            if (obj.containerName == newContainer.containerName) {
                obj.samples = copyKeyObject(newContainer.samples)
            }
        })
        return oldContainer
    }


    const removeCells = useCallback(
        (samples) => {
            const containerObj = {}
            Object.keys(samples).forEach(key => {
                if (!containerObj[samples[key].sourceContainer]) {
                    containerObj[samples[key].sourceContainer] = []
                }
                containerObj[samples[key].sourceContainer].push(key)
            })


            const copySourceContainerSamples = copyContainerArray(sourceContainerSamples)
            const copyDestinationSamples = copyContainerArray(destinationContainerSamples)

            console.log(containerObj, destinationContainerSamples)
            Object.keys(containerObj).forEach(container =>
                containerObj[container].forEach(id => {
                    delete copyDestinationSamples[destinationIndex].samples[id]
                    const sourceIndex = sourceContainerSamples.findIndex(source => source.containerName == container)
                    console.log(sourceIndex, sourceContainerSamples, container)
                    copySourceContainerSamples[sourceIndex].samples[id].type = NONE_STRING
                }
                )
            )
            setDestinationContainerSamples(copyDestinationSamples)
            setSourceContainerSample(copySourceContainerSamples)

        }
        , [sourceContainerSamples, destinationContainerSamples, destinationIndex])

    const changeContainer = useCallback((number: string, name: string, containerType: string) => {

        const tempContainerList = containerType == SOURCE_STRING ? [...sourceContainerSamples] : [...destinationContainerSamples]
        let tempIndex = tempContainerList.findIndex(container => container.containerName == name)


        let length = tempIndex + parseFloat(number)

        if (length == -1)
            length = tempContainerList.length - 1

        if (length > tempContainerList.length - 1)
            length = 0


        if (length != tempIndex) {
            if (containerType == SOURCE_STRING) {
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
        setSourceContainerSample(setContainerSamples(sourceContainerSamples, source))
        setDestinationContainerSamples(setContainerSamples(destinationContainerSamples, destination))
    }, [sourceContainerSamples, destinationContainerSamples])

    //calls backend endpoint to fetch source containers with samples
    return (
        <LibraryTransfer
            sourceSamples={sourceContainerSamples[index]}
            destinationSamples={destinationContainerSamples[destinationIndex]}
            disableChangeSource={sourceContainerSamples.length == 1}
            disableChangeDestination={destinationContainerSamples.length == 1}
            cycleContainer={changeContainer}
            saveChanges={saveChanges}
            addDestination={addContainer}
            removeCells={removeCells} />
    )
}
export default LibraryTransferStep