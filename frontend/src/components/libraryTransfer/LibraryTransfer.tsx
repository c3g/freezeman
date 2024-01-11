import React, { useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button } from 'antd'
import { DESTINATION_STRING, NONE_STRING, PATTERN_STRING, PLACED_STRING, SOURCE_STRING, cellSample, containerSample } from "./LibraryTransferStep"
import LibraryTransferTable from "./LibraryTransferTable"


interface LibraryTransferProps {
    sourceSamples: containerSample,
    destinationSamples: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples) => void,
    cycleContainer: (number, name, containerType) => void,
    addDestination: () => void,
    disableChangeSource: boolean,
    disableChangeDestination: boolean,
    removeCells: (samples) => void,
    saveDestination: () => void,
    changeDestinationName: (name) => void
}

const LibraryTransfer = ({ sourceSamples, destinationSamples, cycleContainer, saveChanges, addDestination, disableChangeSource, disableChangeDestination, removeCells, saveDestination, changeDestinationName }: LibraryTransferProps) => {

    //keyed object by sampleID, containing the coordinates
    const [selectedSamples, setSelectedSamples] = useState<cellSample>({})
    const [placementType, setPlacementType] = useState<string>(PATTERN_STRING)
    const [placementDirection, setPlacementDirection] = useState<string>('row')

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [])


    const clearSelection = useCallback(() => {
        setSelectedSamples({})
    }, [])

    const copyKeyObject = useCallback((obj): any => {
        const copy = {}
        Object.keys(obj).forEach(key => copy[key] = { ...obj[key] })
        return copy
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
    }, [placementDirection])

    //removes selected samples, unless they're in the source container
    const removeSelectedCells = useCallback(() => {
        if (!Object.values(selectedSamples).find(sample => sample.type == 'source')) {
            removeCells(selectedSamples)
            clearSelection()
        }
    }, [selectedSamples])

    const changeContainer = useCallback((number: string, name: string, containerType: string) => {
        cycleContainer(number, name, containerType)
        //clears selection depending on cycle type
        clearSelection()
    }, [cycleContainer])


    const placeGroupSamples = useCallback((sampleObj) => {
        let coordinates = Object.keys(sampleObj).map((key) => key)
        //checks if group can be placed, if cells are already filled, or if they go beyond the boundaries of the cells
        if ((!coordinates.some((coord) => Object.values(destinationSamples.samples).find(sample => sample.coordinates == coord))) && (!coordinates.some(coord => coord.includes('I') || Number(coord.split('_')[1]) > 12)))
            updateSampleList(Object.keys(sampleObj).map(coord => { return { id: sampleObj[coord].id, type: sampleObj[coord].type, coordinates: coord, name: sampleObj[coord].name } }), DESTINATION_STRING)
    }, [destinationSamples.samples, placementType])

    const saveContainerSamples = useCallback((source, destination) => {
        //sends it up to the parent component to be stored, will save the state of containers for when you cycle containers
        saveChanges(
            {
                container_name: sourceSamples.container_name,
                samples: copyKeyObject(source)
            },
            {
                container_name: destinationSamples.container_name,
                samples: copyKeyObject(destination)
            }
        )

    }, [sourceSamples.container_name, destinationSamples.container_name])

    const changeContainerName = useCallback(() => {

    }, [])

    //function to handle the transfer of samples from source to destination
    const transferAllSamples = useCallback(() => {
        //sets all samples to certain type, 'none', 'placed'
        const setType = (type, source, destination) => {
            Object.keys(source).forEach((id) => {
                if (source[id].type == NONE_STRING)
                    destination[id] = { coordinates: source[id].coordinates, type: type, name: source[id].name, sourceContainer: sourceSamples.container_name }
            })
            return destination
        }

        const newSourceSamples = setType(PLACED_STRING, copyKeyObject(sourceSamples.samples), copyKeyObject(sourceSamples.samples))
        const newDestinationSamples = setType(NONE_STRING, copyKeyObject(sourceSamples.samples), copyKeyObject(destinationSamples.samples))

        if (!sampleInCoords(sourceSamples.samples, destinationSamples.samples)) {
            saveContainerSamples(newSourceSamples, newDestinationSamples)
            clearSelection()
        }
    }, [sourceSamples.samples, destinationSamples.samples])


    //used to update to source and destination Samples
    const updateSampleList = (sampleList, containerType) => {
        //to avoid passing reference each object is copied
        const tempSelectedSamples: cellSample = copyKeyObject(selectedSamples)
        const tempSourceSamples: containerSample = copyKeyObject(sourceSamples.samples)
        const tempDestinationSamples: containerSample = copyKeyObject(destinationSamples.samples)

        //iterates over sampleList to decide whether to place them in the selected section or the destination container
        sampleList.forEach(sample => {
            const id = sample.id
            const coord = sample.coordinates
            // to prevent users from placing into empty cells in source container
            if (containerType == DESTINATION_STRING) {
                if (!tempDestinationSamples[id] || sample.type == PATTERN_STRING) {
                    let selectedId: number = 0
                    if (placementType != PATTERN_STRING) {
                        //placing selected samples into destination and setting sourceSamples to 'PLACED'
                        selectedId = parseInt(Object.keys(tempSelectedSamples)[0])
                    } else {
                        selectedId = parseInt(Object.keys(tempSelectedSamples).filter(key => key == id)[0])
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
                            tempDestinationSamples[id] ? tempDestinationSamples[id].sourceContainer : sourceSamples.container_name
                    }
                }
            }
        })

        setSelectedSamples({ ...tempSelectedSamples })

        //updates samples to parent container
        saveContainerSamples(tempSourceSamples, tempDestinationSamples)
    }

    //function handler for the selection table
    const onSampleSelect = useCallback((samples, type) => {
        //get selected samples for respective table
        const selectedSampleList = samples.map(sample => { return { ...sample.sample } })
        const filteredSelected = Object.keys(selectedSamples).filter(id => selectedSamples[id].type == type)

        const ids: any = [];
        if (selectedSampleList.length == 0) {
            //removes selected if array is empty
            filteredSelected.forEach(id => {
                ids.push({ id, coordinates: selectedSamples[id].coordinates })
            })
        }
        else if (selectedSampleList.length < filteredSelected.length) {
            //finds removed id from the selection from antd table
            const id = filteredSelected.filter(x =>
                !selectedSampleList.map((sample) =>
                    sample.id).includes(x)
            )[0];

            ids.push({ id, coordinates: selectedSamples[id].coordinates })
        }
        else {
            const samplePool = type == SOURCE_STRING ? sourceSamples.samples : destinationSamples.samples
            console.log(samplePool, sourceSamples.samples, destinationSamples.samples)
            //gets the newly added sample from the selection from the antd table
            selectedSampleList.forEach(sample => {
                if (sample.type != PLACED_STRING && !filteredSelected.includes(sample.id)) {
                    ids.push({ id: sample.id, coordinates: samplePool[sample.id].coordinates })
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
                        <div style={{ display: 'flex', justifyContent: 'right' }}>
                            <Button onClick={saveDestination}> Save to Prefill </Button>
                        </div>
                        <div className={"flex-row"} style={{ justifyContent: 'center', gap: '1vw' }}>
                            <Radio.Group value={placementType} onChange={evt => updatePlacementType(evt.target.value)}>
                                <Radio.Button value={'pattern'}> Pattern </Radio.Button>
                                <Radio.Button value={'group'}> Group </Radio.Button>
                            </Radio.Group>
                            <Radio.Group
                                disabled={placementType != 'group'}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
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
                                    updateSample={updateSampleList} />
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
                                    updateSample={updateSampleList}
                                    updateSampleGroup={placeGroupSamples}
                                    direction={placementType == 'group' ? placementDirection : undefined}
                                    pattern={placementType == PATTERN_STRING} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'end', gap: '1vw' }}>
                            <Button onClick={transferAllSamples}>Transfer All</Button>
                            <Button onClick={clearSelection}>Clear Selection</Button>
                            <Button onClick={addDestination}>Add Container</Button>
                            <Button onClick={removeSelectedCells}> Remove Cell(s)</Button>
                        </div>
                        <div className={"flex-row"}>
                            <LibraryTransferTable onSampleSelect={(samples) => onSampleSelect(samples, SOURCE_STRING)} samples={filterPlacedSamples(sourceSamples.samples)} selectedSamples={Object.keys(selectedSamples).filter((id: any) => selectedSamples[id].type == SOURCE_STRING)} />
                            <LibraryTransferTable onSampleSelect={(samples) => onSampleSelect(samples, DESTINATION_STRING)} samples={filterPlacedSamples(destinationSamples.samples)} selectedSamples={Object.keys(selectedSamples).filter((id: any) => selectedSamples[id].type == DESTINATION_STRING)} />
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer