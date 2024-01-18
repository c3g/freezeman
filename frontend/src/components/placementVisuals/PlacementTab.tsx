import React, { useCallback, useEffect, useState } from "react"
import Placement, { copyKeyObject } from "./Placement"
import { useAppDispatch } from "../../hooks"
import api from "../../utils/api"
import { Alert } from "antd"
export interface sampleInfo {
    coordinates: string,
    type: string,
    sourceContainer?: string
    name?: string,
    id?: number,
}
export interface cellSample {
    [id: number]: sampleInfo
}
export interface containerSample {
    samples: cellSample
    container_name: string,
    rows: number,
    columns: number,
    container_kind: string,
}
export const NONE_STRING = 'none'
export const PLACED_STRING = 'placed'
export const SELECTED_STRING = 'selected'
export const SOURCE_STRING = 'source'
export const DESTINATION_STRING = 'destination'
export const PATTERN_STRING = 'pattern'

interface PlacementTabProps {
    save: (changes) => void,
    selectedSamples: any,
    stepID: any,
}
const PlacementTab = ({ save, selectedSamples, stepID }: PlacementTabProps) => {
    const dispatch = useAppDispatch()

    const createEmptyContainerArray = useCallback((): containerSample[] => {
        return [
            {
                container_name: '',
                rows: 8,
                columns: 12,
                container_kind: '96-well plate',
                samples: {
                },
            },
        ]
    }, [])

    const fetchListContainers = useCallback(async () => {
        //parse coordinate to removing leading 0
        const parseSamples = (list, selectedSamples, container_name) => {
            const object = {}
            const parseCoordinate = (value) => {
                return value.substring(0, 1) + "_" + (parseFloat(value.substring(1)));
            }
            list.forEach(located_sample => {
                const id = located_sample.sample_id
                const sample = selectedSamples.find(sample => sample.sample.id == id).sample
                object[id] = { id: id, name: sample.name, coordinates: parseCoordinate(located_sample.contextual_coordinates), type: NONE_STRING, sourceContainer: container_name }
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
                    samples: parseSamples(container.sample_locators, selectedSamples, container.name),
                    columns: 12,
                    rows: 8,
                    container_kind: '96-well plate'
                })
            })
        }
        setSourceContainerSamples(containerSamples)
    }, [selectedSamples])



    useEffect(() => {
        fetchListContainers()
    }, [selectedSamples])


    useEffect(() => {
        setSourceContainerSamples(createEmptyContainerArray())
        setDestinationContainerSamples(createEmptyContainerArray())
    }, [stepID])

    const [sourceContainerSamples, setSourceContainerSamples] = useState<containerSample[]>(createEmptyContainerArray())
    const [destinationContainerSamples, setDestinationContainerSamples] = useState<containerSample[]>(createEmptyContainerArray())

    const [index, setIndex] = useState<number>(0)
    const [error, setError] = useState<string | undefined>(undefined)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    const setContainerSamples = (containerList, newSamples, index) => {
        containerList[index].samples = newSamples
        return containerList
    }



    const copyContainerArray = useCallback((containerArray): containerSample[] => {
        return containerArray.map(obj => {
            return {
                columns: obj.columns,
                rows: obj.rows,
                container_name: obj.container_name,
                samples: copyKeyObject(obj.samples),
                container_kind: obj.container_kind,
            }
        })
    }, [])


    const removeCells = useCallback(
        (samples) => {
            const copySourceContainerSamples = copyContainerArray(sourceContainerSamples)
            const copyDestinationSamples = copyContainerArray(destinationContainerSamples)

            if (Object.keys(samples).length == 0) {
                samples = copyDestinationSamples[destinationIndex].samples
            }

            Object.keys(samples).forEach(id => {
                let sourceIndex = sourceContainerSamples.findIndex(source => source.container_name == samples[id].sourceContainer)
                if (!sourceIndex)
                    sourceIndex = copySourceContainerSamples.findIndex(source => source.container_name == copyDestinationSamples[destinationIndex].samples[id].sourceContainer)


                if (sourceIndex != -1) {
                    copySourceContainerSamples[sourceIndex].samples[id].type = NONE_STRING
                    delete copyDestinationSamples[destinationIndex].samples[id]
                }
            })


            setDestinationContainerSamples(copyDestinationSamples)
            setSourceContainerSamples(copySourceContainerSamples)

        }
    , [sourceContainerSamples, destinationContainerSamples.length, destinationIndex])

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

    const addContainer = useCallback((newContainer) => {
        const tempDestinationContainerSamples = copyContainerArray(destinationContainerSamples)
        const emptyContainer = {
            container_name: '',
            samples: {},
            rows: 8,
            columns: 12,
            container_kind: '96-well plate'
        }

        tempDestinationContainerSamples.push({ ...emptyContainer, ...newContainer })
        const indx = tempDestinationContainerSamples.length - 1

        setDestinationContainerSamples(copyContainerArray(tempDestinationContainerSamples))
        setDestinationIndex(indx)
    }, [destinationContainerSamples])


    const saveChanges = useCallback((source, destination) => {
        setSourceContainerSamples(setContainerSamples(sourceContainerSamples, source, index))
        setDestinationContainerSamples(setContainerSamples(destinationContainerSamples, destination, destinationIndex))
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
                        if (container.container_name != '') {
                            placementData[id] = []
                            const coordinates = samples[id].coordinates.split('_')
                            placementData[id].push({ coordinates: coordinates[0] + (Number(coordinates[1]) < 10 ? coordinates[1].padStart(2, '0') : coordinates[1]), container_name: container.container_name, container_barcode: container.container_name, container_kind: '96-well plate' })
                        }
                    })
                }
            })
            if (Object.keys(placementData).length > 0) {
                save(placementData)
            } else {
                setError('Missing placement data')
            }
        } else {
            setError('Missing destination barcode in destination list')
        }
    }, [destinationContainerSamples])

    console.log('render', destinationContainerSamples)
    //calls backend endpoint to fetch source containers with samples
    return (
        <>
            {error ?
                <Alert
                    type='error'
                    message='Destination Error'
                    description={error}
                    closable={true}
                    showIcon={true}
                    onClose={() => { setError(undefined) }}
                />
                : ''}
            <Placement
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
export default PlacementTab
