import React, { useCallback, useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"
import { useAppDispatch, useAppSelector } from "../../hooks"
import api from "../../utils/api"
export interface sampleInfo {
    coordinates: string,
    type: string,
    name: string,
    sourceContainer?: string
}
export interface cellSample {
    [id: string]: sampleInfo
}
export interface containerSample {
    samples: cellSample
    container_name: string,
    rows: number,
    columns: number,
    container_kind?: string,
}
export const NONE_STRING = 'none'
export const PLACED_STRING = 'placed'
export const SELECTED_STRING = 'selected'
export const SOURCE_STRING = 'source'
export const DESTINATION_STRING = 'destination'
export const PATTERN_STRING = 'pattern'
const EMPTY_CONTAINER = [
    {
        container_name: '',
        rows: 8,
        columns: 12,
        samples: {
        },
    },
]
interface IProps {
    save: (changes) => void,
    selectedSamples: any,
    stepID: any,
}
const LibraryTransferStep = ({ save, selectedSamples, stepID }: IProps) => {
    const dispatch = useAppDispatch()

    const fetchListContainers = useCallback(async () => {
        //parse coordinate to removing leading 0
        const parseCoordinate = (value) => {
            return value.substring(0, 1) + "_" + (value.substring(1));
        }
        const parseSamples = (list) => {
            const object = {}
            list.forEach(obj => {
                object[obj.id] = { coordinates: obj.coordinates ? parseCoordinate(obj.coordinates) : '', type: NONE_STRING, name: obj.name }
            })
            return object
        }

        const sampleIDs = selectedSamples.map(sample => sample.sample.id)
        let containerSamples: containerSample[] = EMPTY_CONTAINER
        if (sampleIDs.length > 0) {
            const values = await dispatch(api.containers.listContainerGroups(sampleIDs.join(',')))
            const containers = (values.data)
            containerSamples = []
            Object.keys(containers).forEach(container => {
                containerSamples.push({
                    container_name: container,
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


    const [sourceContainerSamples, setSourceContainerSample] = useState<containerSample[]>(EMPTY_CONTAINER)
    const [destinationContainerSamples, setDestinationContainerSamples] = useState<containerSample[]>(EMPTY_CONTAINER)

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
                container_name: obj.container_name,
                samples: copyKeyObject(obj.samples)
            }
        })
    }, [])

    const setContainerSamples = (oldContainer, newContainer) => {
        oldContainer.forEach((obj: any) => {
            if (obj.container_name == newContainer.container_name) {
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
                    const sourceIndex = sourceContainerSamples.findIndex(source => source.container_name == container)
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
        let tempIndex = tempContainerList.findIndex(container => container.container_name == name)


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
        tempDestinationContainerSamples.push({
            container_name: '',
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

    const changeDestinationName = useCallback((e) => {
        const tempDestination = [ ...destinationContainerSamples ]
        const name = e.target.value
        tempDestination[destinationIndex].container_name = name
        setDestinationContainerSamples(tempDestination)
    }, [destinationContainerSamples, destinationIndex])

    const saveDestination = useCallback(() => {
        save(destinationContainerSamples)
    }, [destinationContainerSamples])

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
                changeDestinationName={changeDestinationName}
                addDestination={addContainer}
                removeCells={removeCells}
                saveDestination={saveDestination} />
        </>
    )
}
export default LibraryTransferStep
