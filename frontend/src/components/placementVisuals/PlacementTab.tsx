import React, { useCallback, useEffect, useState } from "react"
import Placement from "./Placement"
import { notification } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectContainerKindsByID } from "../../selectors";
import api from "../../utils/api"
import { FMSContainer } from "../../models/fms_api_models"

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
export const TUBES_WITHOUT_PARENT = "tubes_without_parent_container"

interface PlacementTabProps {
    save: (changes) => void,
    selectedSamples: any,
    stepID: any,
}
const createEmptyContainerArray = (): containerSample[] => []

//component used to display the tab for sample placement (plate visualization)
const PlacementTab = ({ save, selectedSamples, stepID }: PlacementTabProps) => {

    const dispatch = useAppDispatch()
    const [sourceContainerList, setSourceContainerList] = useState<containerSample[]>(createEmptyContainerArray())
    const [destinationContainerList, setDestinationContainerList] = useState<containerSample[]>(createEmptyContainerArray())
    const containerKinds = useAppSelector(selectContainerKindsByID)

    const [index, setIndex] = useState<number>(0)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    useEffect(() => {
        fetchListContainers()
    }, [selectedSamples])

    useEffect(() => {
        setSourceContainerList(createEmptyContainerArray())
        setDestinationContainerList(createEmptyContainerArray())
    }, [stepID])

    const handleSelectedSamples =
        (sampleIDS) => {
            const tempDestination: any[] = []
            const copyDestination = [...destinationContainerList]
            copyDestination.forEach(container => {
                const copyDestinationSamples = {}
                Object.keys(container.samples).forEach(id => {
                    if (sampleIDS.some((x) => x == id)) {
                        copyDestinationSamples[id] = { ...container.samples[id] }
                    }
                })

                tempDestination.push({ ...container, samples: copyDestinationSamples })
            })
            setDestinationContainerList(tempDestination)
            return tempDestination
        }

    //fetches containers based on selected samples from Step.
    const fetchListContainers = useCallback(async () => {
        //parses samples appropriately so the PlacementContainer component can render it
        const parseSamples = (list, selectedSamples, container_name, destination) => {
            const object = {}
            list.forEach(located_sample => {
                const id = located_sample.sample_id
                const sample = selectedSamples.find(sample => sample.sample.id == id).sample
                object[id] = { id: id, name: sample.name, coordinates: located_sample.contextual_coordinates, type: destination.includes(id.toString()) ? PLACED_STRING : NONE_STRING, sourceContainer: container_name }
            })
            return object
        }

        const sampleIDs = selectedSamples.map(sample => sample.sample.id)
        const destination: any = handleSelectedSamples(sampleIDs)
        let containerSamples: containerSample[] = createEmptyContainerArray()
        if (sampleIDs.length > 0) {
            const values = await dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))
            const containers = (values.data.results.samples.groups)
            containerSamples = []
            containers.forEach(async container => {
              console.log(container)
              if (container && container.name != TUBES_WITHOUT_PARENT) {
                console.log("YO")
                const container_detail: FMSContainer = await dispatch(api.containers.list({ name: container.name })).then(container => container.data.results[0])
                console.log(container_detail)
                console.log(containerKinds[container_detail.kind])
                console.log(containerKinds[container_detail.kind].coordinate_spec[0])
                containerSamples.push({
                    container_name: container.name,
                    samples: parseSamples(container.sample_locators, selectedSamples, container.name, [].concat(destination.map(container => Object.keys(container.samples)).flat(1))),
                    columns: containerKinds[container_detail.kind].coordinate_spec[1].length,
                    rows: containerKinds[container_detail.kind].coordinate_spec[0].length,
                    container_kind: container_detail.kind
                })
              }
            })
        }
        setSourceContainerList(containerSamples)
    }, [selectedSamples])

    //function used to handle add Container, adds it to destination container list
    const addContainer = useCallback(
        (newContainer) => {
            const mutatedContainer = {
                container_name: 'destination' + (destinationContainerList.length + 1),
                samples: {},
                rows: 8,
                columns: 12,
                container_kind: '96-well plate',
                ...newContainer
            }
            setDestinationContainerList([...destinationContainerList, mutatedContainer])
        }, [sourceContainerList, JSON.stringify(destinationContainerList), destinationIndex])


    //function used to handle the removal of cells
    const removeCells = useCallback(
        (samples) => {

            const copySourceContainerSamples = [...sourceContainerList]
            const copyDestinationSamples = [...destinationContainerList]

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
        , [sourceContainerList, JSON.stringify(destinationContainerList), destinationIndex])

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
        (source, destination, name) => {
            const setContainerSamples = (containerList, newSamples, index, name?) => {
                const newList = [...containerList]
                newList[index].samples = newSamples
                newList[index].container_name = name ? name : newList[index].container_name
                return newList
            }
            setSourceContainerList(setContainerSamples([...sourceContainerList], source, index)) 
            setDestinationContainerList(setContainerSamples([...destinationContainerList], destination, destinationIndex, name))
        }, [sourceContainerList, JSON.stringify(destinationContainerList), destinationIndex, index])

    //function used to handle the change of displayed destination name
    const changeDestinationName = useCallback(
        (e) => {
            const tempDestination = [...destinationContainerList]
            tempDestination[destinationIndex].container_name = e.target.value
            setDestinationContainerList(tempDestination)
        }, [destinationContainerList, destinationIndex])

    //function used to pass all of the destination containers to the prefill so that the coordinates can be prefilled for selected samples at step
    const saveDestination = useCallback(() => {
        const placementData = {}
        let error = false
        destinationContainerList.forEach(container => {
            const samples = container.samples
            if (!error && Object.keys(samples).length > 0) {
                if (container.container_name != '') {
                    Object.keys(samples).forEach(id => {
                        if (container.container_name != '') {
                            //NOTE: for future, a sample should be able to have multiple destination coordinates as, hence the placement data at key is an array
                            placementData[id] = []
                            placementData[id].push({ coordinates: samples[id].coordinates, container_name: container.container_name, container_barcode: container.container_name, container_kind: '96-well plate' })
                        }
                    })
                } else {
                      error = true
                      const MISSING_CONTAINER_BARCODE_NOTIFICATION_KEY = `LabworkStep.placement-missing-container-barcode`
                      notification.error({
                          message: `Missing destination container barcode in destination list.`,
                          key: MISSING_CONTAINER_BARCODE_NOTIFICATION_KEY,
                          duration: 20
                      })
                }
            }
        })
        if (!error && Object.keys(placementData).length == 0) {
            error = true
            const MISSING_PLACEMENT_DATA_NOTIFICATION_KEY = `LabworkStep.placement-missing-data`
            notification.error({
                message: `Missing placement data.`,
                key: MISSING_PLACEMENT_DATA_NOTIFICATION_KEY,
                duration: 20
            })
        } 
        if (!error) {
            save(placementData)
        }
    }, [destinationContainerList])


    return (
        <>
            <Placement
                sourceSamples={sourceContainerList.length > 0 ? sourceContainerList[index] ? sourceContainerList[index] : sourceContainerList[0] : undefined}
                destinationSamples={destinationContainerList.length > 0 ? destinationContainerList[destinationIndex] ? destinationContainerList[destinationIndex] : destinationContainerList[0] : undefined}
                disableChangeSource={sourceContainerList.length == 1}
                disableChangeDestination={destinationContainerList.length == 1}
                cycleContainer={changeContainer}
                saveChanges={saveChanges}
                changeDestinationName={changeDestinationName}
                addDestination={addContainer}
                removeCells={removeCells}
                saveDestination={saveDestination}
                setDestinationIndex={setDestinationIndex}
                destinationContainerList={destinationContainerList} />

        </>
    )
}
export default PlacementTab
