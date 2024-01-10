import React, { useCallback, useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { list as listSamples } from "../../modules/samples/actions"
import { selectContainersByID, selectSamplesByID } from "../../selectors"
import api from "../../utils/api"
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
interface IProps {
    onTransfer: (changes) => void,
    selectedSamples: any,
    stepID: any,
}
const LibraryTransferStep = ({ onTransfer, selectedSamples, stepID }: IProps) => {
    const dispatch = useAppDispatch()
    const samplesByID = useAppSelector(selectSamplesByID)
    const containersByID = useAppSelector(selectContainersByID)
    const split_at_index = (value) => {
        return value.substring(0, 1).toLowerCase() + "_" + (parseFloat(value.substring(1)));
    }
    const parseSamples = useCallback((list) => {
        const object = {}
        list.forEach(obj => {
            object[obj.id] = { coordinate: obj.coordinate ? split_at_index(obj.coordinate) : '', type: NONE_STRING, name: obj.name }
        })
        return object
    }, [])
    const fetchListContainers = useCallback(async () => {
        const sampleIDs = selectedSamples.map(sample => sample.sample.id)
        let containerSamples: containerSample[] = [{
            containerName: '',
            rows: 8,
            columns: 12,
            samples: {
            },
        },]
        if (sampleIDs.length > 0) {
            const values = await dispatch(api.containers.listContainerGroups(sampleIDs.join(',')))
            const containers = (values.data)
            containerSamples = []
            Object.keys(containers).forEach(container => {
                containerSamples.push({
                    containerName: container == '0' ? 'tubes_without parent' : container,
                    samples: parseSamples(containers[container]),
                    columns: 12,
                    rows: 8
                })
            })
        }
        setSourceContainerSample(containerSamples)
    }, [selectedSamples])

    useEffect(() => {
        fetchListContainers()
    }, [selectedSamples])

    // useEffect(() => {
    // const containers: any = {}
    // const sampleIDs = selectedSamples.map(sample => sample.sample.id)
    // console.log(Object.keys(samplesByID).length)
    // sampleIDs.forEach(id => {
    // if (containersByID[samplesByID[id].container]) {
    // console.log(id, containersByID[samplesByID[id].container])
    // }
    // })
    // const containerSamples: containerSample[] = []
    // Object.keys(containers).forEach(key => {
    //     containerSamples.push({
    //         containerName: key,
    //         samples: parseSamples(containers[key]),
    //         columns: 12,
    //         rows: 8
    //     })
    // })
    // setSourceContainerSample(containerSamples)
    // }, [samplesByID, containersByID])

    const [sourceContainerSamples, setSourceContainerSample] = useState<containerSample[]>([
        {
            containerName: '',
            rows: 8,
            columns: 12,
            samples: {
            },
        },
    ])
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

            Object.keys(containerObj).forEach(container =>
                containerObj[container].forEach(id => {
                    delete copyDestinationSamples[destinationIndex].samples[id]
                    const sourceIndex = sourceContainerSamples.findIndex(source => source.containerName == container)
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

    const saveToPrefill = useCallback(() => {
        const transferData = {}
        destinationContainerSamples.forEach((container) => {

        })
        onTransfer(transferData)
    }, [])

    //calls backend endpoint to fetch source containers with samples
    return (
        <>
            <LibraryTransfer
                sourceSamples={sourceContainerSamples[index]}
                destinationSamples={destinationContainerSamples[destinationIndex]}
                disableChangeSource={sourceContainerSamples.length == 1}
                disableChangeDestination={destinationContainerSamples.length == 1}
                cycleContainer={changeContainer}
                saveChanges={saveChanges}
                addDestination={addContainer}
                removeCells={removeCells}
                saveToPrefill={saveToPrefill} />
        </>
    )
}
export default LibraryTransferStep
