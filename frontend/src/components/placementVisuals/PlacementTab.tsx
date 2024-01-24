import React, { useCallback, useEffect, useState } from "react"
import Placement, { copyKeyObject } from "./Placement"
import { Alert } from "antd"
import { useAppDispatch } from "../../hooks"
import api from "../../utils/api"

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
export const PREVIEW_STRING = 'preview'

interface PlacementTabProps {
    save: (changes) => void,
    selectedSamples: any,
    stepID: any,
}
const createEmptyContainerArray = (): containerSample[] => {
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
}
//component used to display the tab for sample placement (plate visualization)
const PlacementTab = ({ save, selectedSamples, stepID }: PlacementTabProps) => {

    const dispatch = useAppDispatch()
    const [sourceContainerList, setSourceContainerList] = useState<containerSample[]>(createEmptyContainerArray())
    const [destinationContainerList, setDestinationContainerList] = useState<containerSample[]>(createEmptyContainerArray())

    const [index, setIndex] = useState<number>(0)
    const [error, setError] = useState<string | undefined>(undefined)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    useEffect(() => {
        fetchListContainers()
    }, [selectedSamples])

    useEffect(() => {
        setSourceContainerList(createEmptyContainerArray())
        setDestinationContainerList(createEmptyContainerArray())
    }, [stepID])

    //fetches containers based on selected samples from Step.
    const fetchListContainers = useCallback(async () => {
        //parses samples appropriately so the PlacementContainer component can render it
        const parseSamples = (list, selectedSamples, container_name) => {
            const object = {}
            list.forEach(located_sample => {
                const id = located_sample.sample_id
                const sample = selectedSamples.find(sample => sample.sample.id == id).sample
                object[id] = { id: id, name: sample.name, coordinates: located_sample.contextual_coordinates, type: NONE_STRING, sourceContainer: container_name }
            })
            return object
        }

        const sampleIDs = selectedSamples.map(sample => sample.sample.id)

        if (sampleIDs.length > 0) {
            const containerSamples: containerSample[] = []
            const values = await dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))
            const containers = (values.data.results.samples.groups)

            containers.forEach(container => {
                containerSamples.push({
                    container_name: container.name,
                    samples: parseSamples(container.sample_locators, selectedSamples, container.name),
                    columns: 12,
                    rows: 8,
                    container_kind: '96-well plate'
                })
            })
            setSourceContainerList(containerSamples)
        }
    }, [selectedSamples])


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

    //function used to handle add Container, adds it to destination container list
    const addContainer = useCallback(
        (newContainer) => {
            const tempDestinationContainerSamples = copyContainerArray(destinationContainerList)

            const mutatedContainer = {
                container_name: '',
                samples: {},
                rows: 8,
                columns: 12,
                container_kind: '96-well plate',
                ...newContainer
            }

            tempDestinationContainerSamples.push(mutatedContainer)

            setDestinationContainerList(copyContainerArray(tempDestinationContainerSamples))
            setDestinationIndex(tempDestinationContainerSamples.length - 1)
        }, [destinationContainerList])


    //function used to handle the removal of cells
    const removeCells = useCallback(
        (samples) => {

            const copySourceContainerSamples = copyContainerArray(sourceContainerList)
            const copyDestinationSamples = copyContainerArray(destinationContainerList)

            if (Object.keys(samples).length == 0) {
                samples = copyDestinationSamples[destinationIndex].samples
            }

            //removes it from destination and sets the samples in source containers to be none, from where the samples came from
            Object.keys(samples).forEach(id => {
                let sourceIndex = sourceContainerList.findIndex(source => source.container_name == samples[id].sourceContainer)
                if (!sourceIndex)
                    sourceIndex = copySourceContainerSamples.findIndex(source => source.container_name == copyDestinationSamples[destinationIndex].samples[id].sourceContainer)


                if (sourceIndex != -1) {
                    copySourceContainerSamples[sourceIndex].samples[id].type = NONE_STRING
                    delete copyDestinationSamples[destinationIndex].samples[id]
                }
            })


            setDestinationContainerList(copyDestinationSamples)
            setSourceContainerList(copySourceContainerSamples)

        }
        , [sourceContainerList, destinationContainerList, destinationIndex])

    //function used to handle the cycle of container list
    const changeContainer = useCallback((number: string, containerType: string) => {

        const tempContainerList = containerType == SOURCE_STRING ? [...sourceContainerList] : [...destinationContainerList]
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

    }, [JSON.stringify(destinationContainerList), sourceContainerList, index, destinationIndex])




    //function used to save the changes, to the current displayed source and destination
    const saveChanges = useCallback(
        (source, destination) => {

            const setContainerSamples = (containerList, newSamples, index) => {
                const newList = copyContainerArray(containerList)
                newList[index].samples = newSamples
                return copyContainerArray(newList)
            }
            setSourceContainerList(setContainerSamples(sourceContainerList, source, index))
            setDestinationContainerList(setContainerSamples(destinationContainerList, destination, destinationIndex))
        }, [sourceContainerList, JSON.stringify(destinationContainerList), destinationIndex, index])

    //function used to handle the change of displayed destination name
    const changeDestinationName = useCallback((e) => {
        const tempDestination = copyContainerArray(destinationContainerList)
        tempDestination[destinationIndex].container_name = e.target.value
        setDestinationContainerList(copyContainerArray(tempDestination))
    }, [destinationContainerList, destinationIndex])

    //function used to pass all of the destination containers to the prefill so that the coordinates can be prefilled for selected samples at step
    const saveDestination = useCallback(() => {
        if (destinationContainerList.some(container => container.container_name != '')) {
            const placementData = {}
            destinationContainerList.forEach(container => {
                const samples = container.samples
                if (Object.keys(samples).length > 0) {
                    Object.keys(samples).forEach(id => {
                        if (container.container_name != '') {
                            //NOTE: for future, a sample should be able to have multiple destination coordinates as, hence the placement data at key is an array
                            placementData[id] = []
                            placementData[id].push({ coordinates: samples[id].coordinates, container_name: container.container_name, container_barcode: container.container_name, container_kind: '96-well plate' })
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
    }, [destinationContainerList])

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
                sourceSamples={sourceContainerList[index]}
                destinationSamples={destinationContainerList[destinationIndex] ? destinationContainerList[destinationIndex] : destinationContainerList[0]}
                disableChangeSource={sourceContainerList.length == 1}
                disableChangeDestination={destinationContainerList.length == 1}
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
