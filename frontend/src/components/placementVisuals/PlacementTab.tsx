import React, { useCallback, useEffect, useState } from "react"
import Placement from "./Placement"
import { notification } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectContainerKindsByID } from "../../selectors";
import api from "../../utils/api"
import { FMSContainer, FMSId, LabworkStepInfo, SampleLocator } from "../../models/fms_api_models"
import { CellSample, ContainerSample } from "./models";
import { SampleAndLibrary } from "../WorkflowSamplesTable/ColumnSets";
import { DestinationContainer } from "./AddPlacementContainer";

export const NONE_STRING = 'none'
export const PLACED_STRING = 'placed'
export const SELECTED_STRING = 'selected'
export const SOURCE_STRING = 'source'
export const DESTINATION_STRING = 'destination'
export const PREVIEW_STRING = 'preview'
export const TUBES_WITHOUT_PARENT = "tubes_without_parent_container"

interface PlacementTabProps {
    save: (placementData: any) => void,
    selectedSamples: SampleAndLibrary[],
    stepID: FMSId,
}

//component used to display the tab for sample placement (plate visualization)
const PlacementTab = ({ save, selectedSamples, stepID }: PlacementTabProps) => {

    const dispatch = useAppDispatch()
    const [sourceContainerList, setSourceContainerList] = useState<ContainerSample[]>([])
    const [destinationContainerList, setDestinationContainerList] = useState<ContainerSample[]>([])
    const containerKinds = useAppSelector(selectContainerKindsByID)

    const [index, setIndex] = useState<number>(0)
    const [destinationIndex, setDestinationIndex] = useState<number>(0)

    //fetches containers based on selected samples from Step.
    const fetchListContainers = useCallback(async () => {
      //parses samples appropriately so the PlacementContainer component can render it
      const parseSamples = (list: SampleLocator[], selectedSamples: SampleAndLibrary[], container_name: string, destination: string[]) => {
          const object: CellSample = {}
          list.forEach(located_sample => {
              const id = located_sample.sample_id
              const sample = selectedSamples.find(sample => sample?.sample?.id === id)?.sample
              object[id] = { id: id, name: sample?.name, coordinates: located_sample.contextual_coordinates, type: destination.includes(id.toString()) ? PLACED_STRING : NONE_STRING, sourceContainer: container_name }
          })
          return object
      }

      const sampleIDs = selectedSamples.reduce((prev, curr) => {
        if (curr.sample)
            prev.push(curr.sample.id)
        return prev
      }, [] as FMSId[])
      const destination = handleSelectedSamples(sampleIDs)
      if (sampleIDs.length > 0) {
        const values: LabworkStepInfo = (await dispatch(api.sampleNextStep.labworkStepSummary(stepID, "ordering_container_name", { sample__id__in: sampleIDs.join(',') }))).data
        const containers = values.results.samples.groups
        Promise.all(containers.map(async container => {
          if (container.name != TUBES_WITHOUT_PARENT) {
            const container_detail: FMSContainer = await dispatch(api.containers.list({ name: container.name })).then(container => container.data.results[0])
            return {
              container_name: container.name,
              samples: parseSamples(container.sample_locators, selectedSamples, container.name, destination.map(container => Object.keys(container.samples)).flat(1)),
              columns: containerKinds[container_detail.kind].coordinate_spec[1]?.length ?? 0,
              rows: containerKinds[container_detail.kind].coordinate_spec[0]?.length ?? 0,
              container_kind: container_detail.kind
            } as ContainerSample
          }
          else {
            return {
              container_name: container.name,
              samples: parseSamples(container.sample_locators, selectedSamples, container.name, destination.map(container => Object.keys(container.samples)).flat(1)),
              columns: 0,
              rows: 0,
              container_kind: ''
            } as ContainerSample
          }
        })).then(containerSamples => setSourceContainerList(containerSamples))
      }
  }, [selectedSamples])

    useEffect(() => {
        fetchListContainers()
    }, [fetchListContainers])

    useEffect(() => {
        setSourceContainerList([])
        setDestinationContainerList([])
    }, [stepID])

    const handleSelectedSamples =
        (sampleIDS: FMSId[]) => {
            const copyDestination = [...destinationContainerList]
            const tempDestination = copyDestination.map(container => {
                const copyDestinationSamples = Object.keys(container.samples).reduce((copyDestinationSamples, id) => {
                    if (sampleIDS.some((x) => x === Number(id))) {
                        copyDestinationSamples[id] = { ...container.samples[id] }
                    }
                    return copyDestinationSamples
                }, {} as typeof container.samples)

                return { ...container, samples: copyDestinationSamples }
            })
            setDestinationContainerList(tempDestination)
            return tempDestination
        }

    

    //function used to handle add Container, adds it to destination container list
    const addContainer = useCallback(
        (newContainer: DestinationContainer) => {
            const [axis1, axis2] = newContainer.container_kind ? containerKinds[newContainer.container_kind].coordinate_spec : []
            if (axis1 && axis2) {
                const mutatedContainer = {
                    samples: {},
                    rows: axis1.length,
                    columns: axis2.length,
                    ...newContainer
                }
                setDestinationContainerList([...destinationContainerList, mutatedContainer])
            }
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
        (source, destination) => {
            const setContainerSamples = (containerList, newSamples, index) => {
                const newList = [...containerList]
                newList[index].samples = newSamples
                return newList
            }
            setSourceContainerList(setContainerSamples([...sourceContainerList], source, index)) 
            setDestinationContainerList(setContainerSamples([...destinationContainerList], destination, destinationIndex))
        }, [sourceContainerList, JSON.stringify(destinationContainerList), destinationIndex, index])

    //function used to pass all of the destination containers to the prefill so that the coordinates can be prefilled for selected samples at step
    const saveDestination = useCallback(() => {
        const placementData = {}
        let error = false
        destinationContainerList.forEach(container => {
            const samples = container.samples
            if (!error && Object.keys(samples).length > 0) {
                if (container.container_barcode != '') {
                    Object.keys(samples).forEach(id => {
                      //NOTE: for future, a sample should be able to have multiple destination coordinates as, hence the placement data at key is an array
                      placementData[id] = placementData[id] ? placementData[id] : []
                      placementData[id].push({ coordinates: samples[id].coordinates, container_name: container.container_name, container_barcode: container.container_barcode, container_kind: container.container_kind })
                    })
                } else {
                      error = true
                      const MISSING_CONTAINER_DETAILS_NOTIFICATION_KEY = `LabworkStep.placement-missing-container-details`
                      notification.error({
                          message: `Missing destination container information in destination list.`,
                          key: MISSING_CONTAINER_DETAILS_NOTIFICATION_KEY,
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
                addDestination={addContainer}
                removeCells={removeCells}
                saveDestination={saveDestination}
                setDestinationIndex={setDestinationIndex}
                destinationContainerList={destinationContainerList} />

        </>
    )
}
export default PlacementTab
