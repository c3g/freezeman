import React, { useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button } from 'antd'
import { DESTINATION_STRING, NONE_STRING, PATTERN_STRING, PLACED_STRING, SOURCE_STRING, cellSample, containerSample } from "./LibraryTransferStep"
import LibraryTransferTable from "./LibraryTransferTable"
import { coordinates } from "../../modules/coordinates/reducers"


interface LibraryTransferProps {
    sourceSamples: containerSample,
    destinationSamples: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples) => void,
    cycleContainer: (number, name, containerType) => void,
    addDestination: () => void,
    disableChangeSource: boolean,
    disableChangeDestination: boolean
}

const LibraryTransfer = ({ sourceSamples, destinationSamples, cycleContainer, saveChanges, addDestination, disableChangeSource, disableChangeDestination }: LibraryTransferProps) => {

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<cellSample>({})
    const [placementType, setPlacementType] = useState<string>('pattern')
    const [placementDirection, setPlacementDirection] = useState<string>('row')


    const copyKeyObject = useCallback((obj): any => {
        const copy = {}
        Object.keys(obj).forEach(key => copy[key] = { ...obj[key] })
        return copy
    }, [])

    const saveContainerSamples = useCallback((source, destination) => {
        saveChanges(
            {
                containerName: sourceSamples.containerName,
                samples: copyKeyObject(source)
            },
            {
                containerName: destinationSamples.containerName,
                samples: copyKeyObject(destination)
            }
        )

    }, [sourceSamples.containerName, destinationSamples.containerName])

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [placementDirection])


    const placeGroupSamples = useCallback((sampleObj) => {

        let coordinates = Object.keys(sampleObj).map((key) => key)

        const error = (coordinates.some((coord) => Object.values(destinationSamples.samples).find(sample => sample.coordinate == coord)))

        if (!error)
            updateSampleList(Object.keys(sampleObj).map(coord => { return { id: sampleObj[coord].id, type: sampleObj[coord].type, coordinate: coord } }), DESTINATION_STRING)


    }, [destinationSamples.samples, placementType])

    const sampleInCoords = useCallback((source, destination) => {
        const value = (Object.values(source).some(
            (sourceSample: any) =>
                Object.values(destination).find(
                    (destinationSample: any) => destinationSample.coordinate == sourceSample.coordinate && sourceSample.type != 'placed'
                )
        ))

        return value
    }, [])

    const transferAllSamples = useCallback(() => {
        //sets all samples to certain type
        const setType = (type, source, destination) => {
            Object.keys(source).forEach((id) => {
                if (source[id].type == NONE_STRING)
                    destination[id] = { coordinate: source[id].coordinate, type: type }
            })
            return destination
        }

        const newSourceSamples = setType(PLACED_STRING, copyKeyObject(sourceSamples.samples), copyKeyObject(sourceSamples.samples))
        const newDestinationSamples = setType(NONE_STRING, copyKeyObject(sourceSamples.samples), copyKeyObject(destinationSamples.samples))

        if (!sampleInCoords(sourceSamples.samples, destinationSamples.samples)) {
            saveContainerSamples(newSourceSamples, newDestinationSamples)
            setSelectedSamples({})
        }
    }, [sourceSamples.samples, destinationSamples.samples])


    const clearSelection = useCallback(() => {
        setSelectedSamples({})
    }, [])

    const changeContainer = useCallback((number: string, name: string, containerType: string) => {
        //clears selection depending on cycle type
        cycleContainer(number, name, containerType)
        setSelectedSamples({})
    }, [cycleContainer])

    const updateSampleList = (sampleList, containerType) => {
        const tempSelectedSamples: cellSample = copyKeyObject(selectedSamples)
        const tempSourceSamples: containerSample = copyKeyObject(sourceSamples.samples)
        const tempDestinationSamples: containerSample = copyKeyObject(destinationSamples.samples)

        // console.log(sampleList, tempDestinationSamples, containerType)
        sampleList.forEach(sample => {
            const id = sample.id
            const coord = sample.coordinate
            //if container is destination, also to prevent users from placing into empty cells in source container
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
                        tempDestinationSamples[selectedId] = { coordinate: coord, type: NONE_STRING, sourceContainer: tempSourceSamples.containerName }

                        if (tempSourceSamples[selectedId] && tempSourceSamples[selectedId].type != PLACED_STRING) {
                            //if id exists in source, set sample to placed
                            tempSourceSamples[selectedId].type = PLACED_STRING
                        }

                        //removes from selected samples
                        delete tempSelectedSamples[selectedId]

                    }

                }

            }
            //if sample id exists, it delete in selectedSamples, else adds it to selected samples object
            if (id && sample.type != PLACED_STRING && sample.type != PATTERN_STRING) {
                if (tempSelectedSamples[id]) {
                    delete tempSelectedSamples[id]
                } else {
                    tempSelectedSamples[id] = { coordinate: coord, type: containerType }
                }
            }
        })

        setSelectedSamples({ ...tempSelectedSamples })

        //updates samples to parent container
        saveContainerSamples(tempSourceSamples, tempDestinationSamples)
    }


    const onSampleSelect = useCallback((samples, type) => {
        let selectedSampleList = samples.map(sample => { return { ...sample.sample } })
        //get selected samples for respective table
        const filteredSelected = Object.keys(selectedSamples).filter(id => selectedSamples[id].type == type)
        let ids: any = [];
        if (selectedSampleList.length == 0) {
            //removes selected if array is empty
            filteredSelected.forEach(id => {
                ids.push({ id, coordinate: selectedSamples[id].coordinate })
            })
        }
        else if (selectedSampleList.length < filteredSelected.length) {
            //finds removed id from the selection from antd table
            const id = filteredSelected.filter(x =>
                !selectedSampleList.map((sample) =>
                    sample.id).includes(x)
            )[0];

            ids.push({ id, coordinate: selectedSamples[id].coordinate })
        }
        else {
            const samplePool  = type == SOURCE_STRING ? sourceSamples.samples : destinationSamples.samples
            //gets the newly added sample from the selection from the antd table
            selectedSampleList.forEach(sample => {
                if (sample.type != PLACED_STRING && !filteredSelected.includes(sample.id)) {
                    ids.push({ id: sample.id, coordinate: samplePool[sample.id].coordinate })
                }
            })
        }
        updateSampleList(ids, type)
    }, [selectedSamples])

    const filterPlacedSamples = useCallback((samples) => {
        const filtered: any = []
        Object.keys(samples).map(id => {
            if (samples[id].type != PLACED_STRING)
                filtered.push({ sample: { id: id, type: samples[id].type } })
        })
        return filtered
    }, [])


    return (
        <>
            <PageContainer>
                <PageContent>
                    <div className={"flex-column"}>
                        <div className={"flex-row"} style={{ justifyContent: 'center', gap: '1vw' }}>
                            <Radio.Group value={placementType} onChange={evt => updatePlacementType(evt.target.value)}>
                                <Radio.Button value={'pattern'}> Pattern </Radio.Button>
                                <Radio.Button value={'single'}> Single </Radio.Button>
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
                                    name={sourceSamples.containerName}
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
                                    name={destinationSamples.containerName}
                                    changeContainer={changeContainer}
                                    changeContainerName={() => { }} />
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