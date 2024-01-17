import React, { useCallback, useEffect, useState } from "react"
import LibraryTransfer from "./LibraryTransfer"
import { useAppDispatch } from "../../hooks"
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

interface IProps {
    save: (changes) => void,
    selectedSamples: any,
    stepID: any,
}
const LibraryTransferStep = ({ save, selectedSamples, stepID }: IProps) => {
    const dispatch = useAppDispatch()

    const createEmptyContainerArray = useCallback(() => {
        return [
            {
                container_name: '',
                rows: 8,
                columns: 12,
                samples: {
                },
            },
        ]
    }, [])

    const fetchListContainers = useCallback(async () => {
        //parse coordinate to removing leading 0
        const parseCoordinate = (value) => {
            return value.substring(0, 1) + "_" + (value.substring(1));
        }
        const parseSamples = (list, selectedSamples) => {
            const object = {}
            list.forEach(id => {
                const sample = selectedSamples.find(sample => sample.sample.id == id).sample
                object[id] = {id: sample.id, name: sample.name, coordinate: '' }
            })
            return object
        }

        const sampleIDs = selectedSamples.map(sample => sample.sample.id)

        let containerSamples: containerSample[] = createEmptyContainerArray()
        if (sampleIDs.length > 0) {
            const values = await dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))
            const containers = (values.data.results.samples.groups)

            containerSamples = []

            containers.forEach(container => {
                containerSamples.push({
                    container_name: container.name,
                    samples: parseSamples(container.sample_ids, selectedSamples),
                    columns: 12,
                    rows: 8
                })
            })
        }
        console.log(containerSamples)
        setSourceContainerSample(containerSamples)
    }, [selectedSamples])



    useEffect(() => {
        fetchListContainers()
    }, [selectedSamples])


    useEffect(() => {
        setSourceContainerSample(createEmptyContainerArray())
        setDestinationContainerSamples(createEmptyContainerArray())
    }, [stepID])

    const [sourceContainerSamples, setSourceContainerSample] = useState<containerSample[]>(createEmptyContainerArray())
    const [destinationContainerSamples, setDestinationContainerSamples] = useState<containerSample[]>(createEmptyContainerArray())

    const [index, setIndex] = useState<number>(0)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    const setContainerSamples = (oldContainer, newContainer) => {
        oldContainer.forEach((obj: any) => {
            if (obj.container_name == newContainer.container_name) {
                obj.samples = copyKeyObject(newContainer.samples)
            }
        })
        return oldContainer
    }

    const copyKeyObject = useCallback((obj) => {
        const copy = {}
        Object.keys(obj).forEach(key => copy[key] = { ...obj[key] })
        return copy
    }, [])



    const copyContainerArray = useCallback((containerArray): containerSample[] => {
        return containerArray.map(obj => {
            return {
                columns: obj.columns,
                rows: obj.rows,
                container_name: obj.container_name,
                samples: copyKeyObject(obj.samples)
            }
        })
    }, [])


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

    const changeContainer = useCallback((number: string, containerType: string) => {

        const tempContainerList = containerType == SOURCE_STRING ? [...sourceContainerSamples] : [...destinationContainerSamples]
        let tempIndex = containerType == SOURCE_STRING ? index : destinationIndex


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

    }, [destinationContainerSamples, sourceContainerSamples, index, destinationIndex])

    const addContainer = useCallback(() => {
        const tempDestinationContainerSamples = copyContainerArray(destinationContainerSamples)
        let indx = tempDestinationContainerSamples.findIndex(container => container.container_name == '')
        if (indx == -1) {
            tempDestinationContainerSamples.push({
                container_name: '',
                samples: {},
                rows: 8,
                columns: 12,
            })
            setDestinationContainerSamples(tempDestinationContainerSamples)
            indx = tempDestinationContainerSamples.length - 1
        }
        setDestinationIndex(indx)
    }, [destinationContainerSamples, destinationIndex])


    const saveChanges = useCallback((source, destination) => {
        setSourceContainerSample(setContainerSamples(sourceContainerSamples, source))
        setDestinationContainerSamples(setContainerSamples(destinationContainerSamples, destination))
    }, [sourceContainerSamples, destinationContainerSamples])

    const changeDestinationName = useCallback((e) => {
        const tempDestination = copyContainerArray(destinationContainerSamples)
        tempDestination[destinationIndex].container_name = e.target.value
        setDestinationContainerSamples(tempDestination)
    }, [destinationContainerSamples, destinationIndex])

    const saveDestination = useCallback(() => {
        if (destinationContainerSamples.some(container => container.container_name != '')) {
            const placementData = {}
            destinationContainerSamples.forEach(container => {
                const samples = container.samples
                if (Object.keys(samples).length > 0) {
                    Object.keys(samples).forEach(id => {
                        if (container.container_name) {
                            placementData[id] = []
                            const coordinates = samples[id].coordinates.split('_')
                            placementData[id].push({ coordinates: coordinates[0] + (Number(coordinates[1]) < 10 ? coordinates[1].padStart(2, '0') : coordinates[1]), container_name: container.container_name, container_barcode: container.container_name, container_kind: '96-well plate' })
                        }
                    })
                }
            })
            save(placementData)
        }
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
