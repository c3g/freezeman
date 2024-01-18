import React, { useState } from "react"
import TransferContainer from "./PlacementContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Popconfirm, Switch } from 'antd'
import { DESTINATION_STRING, NONE_STRING, PATTERN_STRING, PLACED_STRING, SOURCE_STRING, cellSample, containerSample } from "./PlacementTab"

import LibraryTransferTable from "./PlacementSamplesTable"
import AddPlacementContainer from "./AddPlacementContainer"



interface LibraryTransferProps {
    sourceSamples: containerSample,
    destinationSamples: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples) => void,
    cycleContainer: (number, containerType) => void,
    addDestination: (any?) => void,
    disableChangeSource: boolean,
    disableChangeDestination: boolean,
    removeCells: (samples) => void,
    saveDestination: () => void,
    changeDestinationName: (name) => void
}
export const copyKeyObject = (obj): any => {
    const copy = {}
    Object.keys(obj).forEach(key => copy[key] = { ...obj[key] })
    return copy
}

const LibraryTransfer = ({ sourceSamples, destinationSamples, cycleContainer, saveChanges, addDestination, disableChangeSource, disableChangeDestination, removeCells, saveDestination, changeDestinationName }: LibraryTransferProps) => {

    //keyed object by sampleID, containing the coordinates
    const [selectedSamples, setSelectedSamples] = useState<cellSample>({})
    const [groupPlacement, setGroupPlacement] = useState<boolean>(true)
    const [placementDirection, setPlacementDirection] = useState<string>('row')


    const updateGroupPlacement = useCallback(() => {
        setGroupPlacement(!groupPlacement)
    }, [groupPlacement])


    const clearSelection = useCallback(() => {
        setSelectedSamples({})
    }, [])



    const sampleInCoords = useCallback((source, destination) => {
        const value = (Object.values(source).some(
            (sourceSample: any) =>
                Object.values(destination).find(
                    (destinationSample: any) => destinationSample.coordinates == sourceSample.coordinates && sourceSample.type != PLACED_STRING
                )
        ))

        return value
    }, [])

    const filterPlacedSamples = useCallback((samples) => {
        const filtered: any = []
        Object.keys(samples).map(id => {
            if (samples[id].type != PLACED_STRING)
                filtered.push({ sample: { id: id, type: samples[id].type, name: samples[id].name } })
        })
        return filtered
    }, [])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [])

    //removes selected samples, unless they're in the source container
    const removeSelectedCells = useCallback(() => {
        // if (!Object.values(selectedSamples).filter(sample => sample.type == 'source') || Object.keys(selectedSamples).length == 0) {
        removeCells(selectedSamples)
        clearSelection()
        // }
    }, [selectedSamples])

    const changeContainer = useCallback((number: string, containerType: string) => {
        cycleContainer(number, containerType)
        //clears selection depending on cycle type
        clearSelection()
    }, [cycleContainer])


    const updateSamples = useCallback((array, containerType) => {

        const coordinates = array.map((sample) => sample.coordinates)

        let canUpdate = true

        //checks if group can be placed, if cells are already filled, or if they go beyond the boundaries of the cells
        if (containerType == DESTINATION_STRING) {
            if (((coordinates.some(coord => coord.includes('I') || Number(coord.split('_')[1]) > 12)))) {
                canUpdate = false
            }
        }
        array = array.filter(sample => sample.id)
        if (canUpdate)
            updateSampleList(array, containerType)
    }, [destinationSamples.samples, selectedSamples])

    const saveContainerSamples = useCallback((source, destination) => {
        //sends it up to the parent component to be stored, will save the state of containers for when you cycle containers
        if (sourceSamples.container_name) {
            saveChanges(source, destination)
        }

    }, [sourceSamples.container_name, destinationSamples.container_name])

    //function to handle the transfer of samples from source to destination
    const transferAllSamples = useCallback(() => {
        //sets all samples to certain type, 'none', 'placed'
        const setType = (type, source, sampleObj) => {
            Object.keys(source).forEach((id) => {
                if (source[id].type == NONE_STRING && source[id].coordinates)
                    sampleObj[id] = { coordinates: source[id].coordinates, type: type, name: source[id].name, sourceContainer: sourceSamples.container_name }
            })
            return sampleObj
        }

        const newSourceSamples = setType(PLACED_STRING, copyKeyObject(sourceSamples.samples), copyKeyObject(sourceSamples.samples))
        const newDestinationSamples = setType(NONE_STRING, copyKeyObject(sourceSamples.samples), copyKeyObject(destinationSamples.samples))


        if (!sampleInCoords(sourceSamples.samples, destinationSamples.samples)) {
            saveContainerSamples(newSourceSamples, newDestinationSamples)
            clearSelection()
        }
    }, [sourceSamples.samples, destinationSamples.samples, sourceSamples.container_name, destinationSamples.container_name])


    //used to update to source and destination Samples
    const updateSampleList = useCallback(
        (sampleList, containerType) => {
            //to avoid passing reference each object is copied
            const tempSelectedSamples: cellSample = copyKeyObject(selectedSamples)
            const tempSourceSamples: cellSample = copyKeyObject(sourceSamples.samples)
            const tempDestinationSamples: cellSample = copyKeyObject(destinationSamples.samples)

            //iterates over sampleList to decide whether to place them in the selected section or the destination container
            sampleList.forEach(sample => {
                const id = sample.id
                const coord = sample.coordinates
                // to prevent users from placing into empty cells in source container
                if (containerType == DESTINATION_STRING) {
                    if (!tempDestinationSamples[id] || sample.type == PATTERN_STRING) {
                        let selectedId

                        selectedId = (Object.keys(tempSelectedSamples).filter(key => key == id)[0])

                        if (!selectedId) {
                            selectedId = (Object.keys(tempSelectedSamples)[0])
                        }

                        if (selectedId) {
                            //if id exists in selectedSamples is selected from destination then move from destination
                            if (tempSelectedSamples[selectedId].type == DESTINATION_STRING) {
                                delete tempDestinationSamples[selectedId]
                            }
                            tempDestinationSamples[selectedId] = { coordinates: coord, type: NONE_STRING, name: tempSelectedSamples[selectedId].name, sourceContainer: tempSelectedSamples[selectedId].sourceContainer }

                            if (tempSourceSamples[selectedId] && tempSourceSamples[selectedId].type != PLACED_STRING) {
                                //if id exists in source, set sample to placed
                                tempSourceSamples[selectedId].type = PLACED_STRING
                            }

                            //removes from selected samples
                            delete tempSelectedSamples[selectedId]

                        }

                    }

                }


                //if sample id exists, it deletes in selectedSamples, else adds it to selected samples object
                if (id && sample.type != PLACED_STRING && sample.type != PATTERN_STRING) {
                    if (tempSelectedSamples[id]) {
                        delete tempSelectedSamples[id]
                    } else {
                        tempSelectedSamples[id] = {
                            coordinates: coord, type: containerType, name: sample.name,
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
        }, [selectedSamples, sourceSamples.samples, destinationSamples.samples])

    //function handler for the selection table
    const onSampleTableSelect = useCallback((samples, type) => {
        //get selected samples for respective table
        const selectedSampleList = samples.map(sample => { return { ...sample.sample } })
        const filteredSelected = Object.keys(selectedSamples).filter(id => selectedSamples[id].type == type)

        const ids: any = [];
        if (selectedSampleList.length == 0) {
            //removes selected if array is empty
            filteredSelected.forEach(id => {
                ids.push({ id, coordinates: selectedSamples[id].coordinates, name: selectedSamples[id].name })
            })
        }
        else if (selectedSampleList.length < filteredSelected.length) {
            //finds removed id from the selection from antd table
            const filteredIds = filteredSelected.filter(x =>
                !selectedSampleList.map((sample) =>
                    sample.id).includes(x)
            );

            filteredIds.forEach(id => {
                ids.push({ id, coordinates: selectedSamples[id].coordinates, name: selectedSamples[id].name })
            })
        }
        else {
            const samplePool = type == SOURCE_STRING ? sourceSamples.samples : destinationSamples.samples
            //gets the newly added sample from the selection from the antd table
            selectedSampleList.forEach(sample => {
                if (sample.type != PLACED_STRING && !filteredSelected.includes(sample.id)) {
                    ids.push({ id: sample.id, coordinates: samplePool[sample.id].coordinates, name: samplePool[sample.id].name })
                }
            })
        }
        updateSampleList(ids, type)
    }, [selectedSamples, sourceSamples.samples, destinationSamples.samples])

    return (
        <>
            <PageContainer>
                <PageContent>
                    <div className={"flex-column"}>
                        <div className={"flex-row"} style={{ justifyContent: 'end', gap: '1vw' }}>
                            <AddPlacementContainer addDestination={() => { }} />
                            <Button onClick={saveDestination} style={{ backgroundColor: "#1890ff", color: "white" }}> Save to Prefill </Button>
                        </div>
                        <div className={"flex-row"}>
                            <div className={"flex-column"}>
                                <ContainerNameScroller
                                    disabled={disableChangeSource}
                                    containerType={SOURCE_STRING}
                                    name={sourceSamples.container_name}
                                    changeContainer={changeContainer} />
                                <TransferContainer
                                    selectedSampleList={selectedSamples}
                                    containerType={SOURCE_STRING}
                                    columns={sourceSamples.columns}
                                    rows={sourceSamples.rows}
                                    samples={sourceSamples.samples}
                                    updateSamples={updateSamples} />
                            </div>
                            <div className={"flex-column"}>
                                <ContainerNameScroller
                                    disabled={disableChangeDestination}
                                    containerType={DESTINATION_STRING}
                                    name={destinationSamples.container_name}
                                    changeContainer={changeContainer}
                                    changeContainerName={changeDestinationName} />
                                <TransferContainer
                                    selectedSampleList={selectedSamples}
                                    containerType={DESTINATION_STRING}
                                    columns={destinationSamples.columns}
                                    rows={destinationSamples.rows}
                                    samples={destinationSamples.samples}
                                    updateSamples={updateSamples}
                                    direction={groupPlacement ? placementDirection : undefined}
                                    pattern={!groupPlacement} />
                            </div>
                        </div>
                        <div></div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1vw' }}>
                            <div>
                                <Switch checkedChildren="Pattern" unCheckedChildren="Group" checked={groupPlacement} onChange={updateGroupPlacement}></Switch>
                            </div>
                            <Radio.Group
                                disabled={!groupPlacement}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'end', gap: '1vw' }}>

                            <Button onClick={transferAllSamples}>Place All Source</Button>
                            <Button onClick={clearSelection}>Deselect All</Button>
                            <Popconfirm
                                title={`Are you sure you want to undo selected samples? If there are no selected samples, it will undo all placements.`}
                                onConfirm={removeSelectedCells}
                                placement={'bottomRight'}
                            >
                                <Button> Undo Placement</Button>
                            </Popconfirm>
                        </div>
                        <div className={"flex-row"}>
                            <LibraryTransferTable onSampleSelect={(samples) => onSampleTableSelect(samples, SOURCE_STRING)} samples={filterPlacedSamples(sourceSamples.samples)} selectedSamples={Object.keys(selectedSamples).filter((id: any) => selectedSamples[id].type == SOURCE_STRING)} />
                            <LibraryTransferTable onSampleSelect={(samples) => onSampleTableSelect(samples, DESTINATION_STRING)} samples={filterPlacedSamples(destinationSamples.samples)} selectedSamples={Object.keys(selectedSamples).filter((id: any) => selectedSamples[id].type == DESTINATION_STRING)} />
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer