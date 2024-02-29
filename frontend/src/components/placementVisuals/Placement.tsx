import React, { useMemo, useState } from "react"
import PlacementContainer from "./PlacementContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Popconfirm, Switch, Typography, Row, Col, notification } from 'antd'
import { DESTINATION_STRING, NONE_STRING, PREVIEW_STRING, PLACED_STRING, SOURCE_STRING, cellSample, containerSample } from "./PlacementTab"

import PlacementSamplesTable from "./PlacementSamplesTable"
import AddPlacementContainer from "./AddPlacementContainer"

const { Title } = Typography

interface PlacementProps {
    sourceSamples?: containerSample,
    destinationSamples?: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples, destinationName) => void,
    cycleContainer: (number, containerType) => void,
    addDestination: (any) => void,
    disableChangeSource: boolean,
    disableChangeDestination: boolean,
    removeCells: (samples) => void,
    saveDestination: () => void,
    setDestinationIndex: (number) => void,
    destinationContainerList: containerSample[],
}

//component used to handle the transfer of samples from source to destination, or destination to destination
const Placement = ({ sourceSamples, destinationSamples, cycleContainer, saveChanges, addDestination, disableChangeSource, disableChangeDestination, removeCells, saveDestination, setDestinationIndex, destinationContainerList }: PlacementProps) => {

    //keyed object by sampleID, containing the coordinates, type, sourceContainer, id
    const [selectedSamples, setSelectedSamples] = useState<cellSample>({})

    //used to determine whether the cells are to be placed in a column or row grouping (ordered by id), or by pattern (keeping same order as they were in the source)
    const [placementType, setPlacementType] = useState<boolean>(true)
    //if placement type is group used to keep track if it's by row or column
    const [placementDirection, setPlacementDirection] = useState<string>('row')


    const updateGroupPlacement = useCallback(() => {
        setPlacementType(!placementType)
    }, [placementType])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedSamples({})
    }, [])

    const filterSelectedSamples = (type) => {
        return Object.keys(selectedSamples).map(id => parseInt(id))
    }

    //returns samples only if not placed
    const filterPlacedSamples = useCallback((samples) => {
        const filtered: any = []
        Object.keys(samples).map(id => {
            if (samples[id].type != PLACED_STRING)
                filtered.push({ ...samples[id] })
        })
        return filtered
    }, [])

    //removes selected samples, unless they're in the source container
    const removeSelectedCells = useCallback(() => {
        const selected = {}
        Object.keys(selectedSamples).forEach(id => {
            if (selectedSamples[id].type != SOURCE_STRING) {
                selected[id] = selectedSamples[id]
            }
        })
        const removed = (Object.keys(selected).length > 0 ? selected : destinationSamples ? destinationSamples.samples : {})
        removeCells(removed)
        clearSelection()
    }, [selectedSamples])

    const changeContainer = useCallback((number: string, containerType: string) => {
        cycleContainer(number, containerType)
        //clears selection depending on cycle type
        clearSelection()
    }, [cycleContainer])


    //function used by PlacementContainer.tsx used for error prevention, checks if samples cannot be placed (out of bounds)
    const updateSamples = useCallback((array, containerType, containerRows, containerColumns) => {
        const coordinates = array.map((sample) => sample.coordinates)
        let canUpdate = true

        //checks if group can be placed, if cells are already filled, or if they go beyond the boundaries of the cells
        if (containerType == DESTINATION_STRING) {
            if (((coordinates.some(coord => coord.charCodeAt(0) - 64 > containerRows || Number(coord.substring(1)) > containerColumns)))) {
                canUpdate = false
            }
        }
        array = array.filter(sample => sample.id)
        if (canUpdate)
            updateSampleList(array, containerType)
    }, [destinationSamples, selectedSamples])

    //function used to send containers and their samples up to the parent component to be stored, will save the state of containers for when you cycle containers
    const saveContainerSamples = (source, destination) => {
        if (destinationSamples && sourceSamples && sourceSamples.container_name) {
            saveChanges(source, destination, destinationSamples.container_name)
        }
    }

    //used to check if the destination has samples in cells already
    const sampleInCoords = (source, destination) => {
        const value = (Object.values(source).some(
            (sourceSample: any) =>
                Object.values(destination).find(
                    (destinationSample: any) => destinationSample.coordinates == sourceSample.coordinates && sourceSample.type != PLACED_STRING
                )
        ))

        return value
    }

    //function used to handle the transfer of all available samples from source to destination
    const transferAllSamples = useCallback(() => {
      if (sourceSamples && destinationSamples) {
        if (sourceSamples.rows != destinationSamples.rows || sourceSamples.columns != destinationSamples.columns) {
          const INCOMPATIBLE_CONTAINER_KIND_NOTIFICATION_KEY = `LabworkStep.placement-incompatible-container-kind`
          notification.error({
            message: `Source and destination containers must have compatible dimensions.`,
            key: INCOMPATIBLE_CONTAINER_KIND_NOTIFICATION_KEY,
            duration: 20
          })
        }
        else {
          //sets all samples to certain type, 'none', 'placed'
          const setType = (type, source, sampleObj) => {
            Object.keys(source).forEach((id) => {
              if (source[id].type == NONE_STRING && source[id].coordinates) {
                sampleObj[id] = { ...source[id], type: type, sourceContainer: sourceSamples.container_name }
              }
            })
            return sampleObj
          }

          const newSourceSamples = setType(PLACED_STRING, { ...sourceSamples.samples }, { ...sourceSamples.samples })
          const newDestinationSamples = setType(NONE_STRING, { ...sourceSamples.samples }, { ...destinationSamples.samples })

          if (!sampleInCoords(sourceSamples.samples, destinationSamples.samples)) {
              saveContainerSamples(newSourceSamples, newDestinationSamples)
              clearSelection()
          }
        }
      }
    }, [sourceSamples, destinationSamples])


    //function used to update source and destination samples
    const updateSampleList = useCallback(
        (sampleList, containerType) => {
            if (sourceSamples && destinationSamples) {
              //to avoid passing reference each object is copied
              const tempSelectedSamples: cellSample = { ...selectedSamples }
              const tempSourceSamples: cellSample = { ...sourceSamples.samples }
              const tempDestinationSamples: cellSample = { ...destinationSamples.samples }
              const canPlace = sampleInCoords(sampleList, tempDestinationSamples)
              //iterates over list of samples to decide whether to place them in the 'selectedSamples' or the destination container
              sampleList.forEach(sample => {
                const id = parseInt(sample.id)

                // to prevent users from placing into empty cells in source container
                if (containerType == DESTINATION_STRING) {
                    if ((!tempDestinationSamples[id] || sample.type == PREVIEW_STRING) && !canPlace) {
                        let selectedId

                        //chhecks to see if id exists in selectedSamples
                        selectedId = (Object.keys(tempSelectedSamples).filter(key => key == id.toString())[0])
                        if (!selectedId) {
                            selectedId = (Object.keys(tempSelectedSamples)[0])
                        }

                        if (selectedId) {
                            // it is removed from destination in case it's being moved from destination to destination
                            if (tempSelectedSamples[selectedId].type == DESTINATION_STRING) {
                                delete tempDestinationSamples[selectedId]
                            }
                            tempDestinationSamples[selectedId] = { ...tempSelectedSamples[selectedId], id, coordinates: sample.coordinates, type: NONE_STRING }

                            //if id exists in source, set sample to placed
                            if (tempSourceSamples[selectedId] && tempSourceSamples[selectedId].type != PLACED_STRING) {
                                tempSourceSamples[selectedId].type = PLACED_STRING
                            }

                            //removes from selected samples
                            delete tempSelectedSamples[selectedId]

                        }

                    }
                }


                //if sample id exists, it deletes in selectedSamples, else adds it to selected samples object
                if (id && sample.type != PLACED_STRING && sample.type != PREVIEW_STRING) {
                    if (tempSelectedSamples[id]) {
                        delete tempSelectedSamples[id]
                    } else {
                        tempSelectedSamples[id] = {
                            ...sample,
                            id,
                            type: containerType,
                            //store source container in case user wants to remove cells, either one that is currently displayed, or use the one stored in the sampleInfo
                            sourceContainer:
                                sample.sourceContainer ? sample.sourceContainer : sourceSamples.container_name
                        }
                    }
                }
            })

            setSelectedSamples({ ...tempSelectedSamples })
            //updates samples to parent container
            saveContainerSamples(tempSourceSamples, tempDestinationSamples)
          }
        }, [selectedSamples, sourceSamples, destinationSamples])

    //function handler for the sample selection table
    const onSampleTableSelect = useCallback((sampleRowKeys, type) => {
        //get selected samples for respective table
        const filteredSelected = Object.keys(selectedSamples).filter(id => selectedSamples[id].type == type)
        const keys = sampleRowKeys.map(id => String(id))


        const samplesToUpdate: any = [];
        if (keys.length == 0) {
            //removes selected if array is empty
            filteredSelected.forEach(id => {
                samplesToUpdate.push({ id, coordinates: selectedSamples[id].coordinates, name: selectedSamples[id].name })
            })
        }
        else if (keys.length < filteredSelected.length) {
            //finds removed id from the selection from antd table
            const filteredIds = filteredSelected.filter(x =>
                !keys.includes(x)
            );

            filteredIds.forEach(id => {
                samplesToUpdate.push({ id, coordinates: selectedSamples[id].coordinates, name: selectedSamples[id].name })
            })
        }
        else {
            //gets the newly added sample from the selection from the antd table
            const samplePool = type == SOURCE_STRING ? sourceSamples && sourceSamples.samples : destinationSamples && destinationSamples.samples
            keys.forEach(key => {
                if (samplePool && samplePool[key].type != PLACED_STRING && !filteredSelected.includes(key)) {
                    samplesToUpdate.push({ id: key, coordinates: samplePool[key].coordinates, name: samplePool[key].name })
                }
            })
        }

        updateSampleList(samplesToUpdate, type)
    }, [selectedSamples, sourceSamples, destinationSamples])

    const disableUndo = useMemo(() => {
      return !!!destinationSamples || Object.values(selectedSamples).some(sample => sample.type == SOURCE_STRING)
    }, [selectedSamples])

    return (
        <>
            <PageContainer>
                <PageContent>
                      <Row justify="end" style={{padding: "10px"}}>
                        <Col span={3}>
                          <AddPlacementContainer onConfirm={(container) => addDestination(container)} setDestinationIndex={setDestinationIndex} destinationContainerList={destinationContainerList} />
                        </Col>
                        <Col span={3}>
                          <Button onClick={saveDestination} style={{ backgroundColor: "#1890ff", color: "white" }}> Save to Prefill </Button>
                        </Col>
                      </Row>  
                      <Row justify="start" style={{paddingTop: "20px", paddingBottom: "40px" }}>
                        <Col span={12}>
                          <div className={"flex-row"}>
                            <div className={"flex-column"}>
                            { sourceSamples ?
                            <>
                              <ContainerNameScroller
                                disabled={disableChangeSource}
                                containerType={SOURCE_STRING}
                                name={sourceSamples.container_name}
                                changeContainer={changeContainer} />
                              <PlacementContainer
                                selectedSampleList={selectedSamples}
                                containerType={SOURCE_STRING}
                                columns={sourceSamples.columns}
                                rows={sourceSamples.rows}
                                samples={sourceSamples.samples}
                                updateSamples={updateSamples} />
                            </>
                              : 
                              <Col span={12}>
                                <div className={"flex-row"}>
                                  <div className={"flex-column"}/>
                                </div>
                              </Col>
                            }
                            </div>
                          </div>
                        </Col>
                        { sourceSamples && destinationSamples ?
                          <Col span={12}>
                            <div className={"flex-row"}>
                              <div className={"flex-column"}>
                                <ContainerNameScroller
                                  disabled={disableChangeDestination}
                                  containerType={DESTINATION_STRING}
                                  name={destinationSamples.container_name}
                                  changeContainer={changeContainer}/>
                                <PlacementContainer
                                  selectedSampleList={selectedSamples}
                                  containerType={DESTINATION_STRING}
                                  columns={destinationSamples.columns}
                                  rows={destinationSamples.rows}
                                  samples={destinationSamples.samples}
                                  updateSamples={updateSamples}
                                  direction={placementType ? placementDirection : undefined}
                                  pattern={!placementType} />
                              </div>
                            </div>
                          </Col>
                          : <Col span={12}>
                              <div className={"flex-row"}>
                                <div className={"flex-column"}/>
                              </div>
                            </Col>
                        }
                      </Row>
                      <Row justify="end" style={{padding: "10px"}}>
                          <Col span={3}>
                            <Switch checkedChildren="Pattern" unCheckedChildren="Group" checked={placementType} onChange={updateGroupPlacement}></Switch>
                          </Col>
                          <Col span={5}>
                            <Radio.Group
                                disabled={!placementType}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
                          </Col>
                        <Col span={8}>
                              <Button onClick={transferAllSamples} disabled={!!!destinationSamples}>Place All Source</Button>
                              <Button onClick={clearSelection}>Deselect All</Button>
                              <Popconfirm
                                  title={`Are you sure you want to undo selected samples? If there are no selected samples, it will undo all placements.`}
                                  onConfirm={removeSelectedCells}
                                  placement={'bottomRight'}
                                  disabled={disableUndo}
                              >
                                  <Button disabled={disableUndo} > Undo Placement</Button>
                              </Popconfirm>
                        </Col>
                      </Row>
                      <Row justify="space-evenly"  style={{padding: "10px"}}>
                        <Col span={10}>
                          <PlacementSamplesTable onSampleSelect={(samples) => onSampleTableSelect(samples, SOURCE_STRING)} samples={filterPlacedSamples(sourceSamples ? sourceSamples.samples : {})} selectedSamples={filterSelectedSamples(SOURCE_STRING)} />
                        </Col>
                        <Col span={10}>
                          <PlacementSamplesTable onSampleSelect={(samples) => onSampleTableSelect(samples, DESTINATION_STRING)} samples={filterPlacedSamples(destinationSamples ? destinationSamples.samples : {})} selectedSamples={filterSelectedSamples(DESTINATION_STRING)} />
                        </Col>
                      </Row>
                </PageContent>
            </PageContainer>
        </>
  )
}
export default Placement