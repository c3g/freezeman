import React, { useEffect, useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Typography, Switch } from 'antd'
import { cellSample, containerSample, sampleInfo } from "./LibraryTransferStep"
import LibraryTransferTable from "./LibraryTransferTable"
const { Text } = Typography;

interface LibraryTransferProps {
    sourceContainerSamples: containerSample,
    destinationContainerSamples: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples) => void,
    cycleContainer: (number, name, type) => void,
    addDestination: () => void
}


const LibraryTransfer = ({ sourceContainerSamples, destinationContainerSamples, cycleContainer, saveChanges, addDestination }: LibraryTransferProps) => {

    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<any>(sourceContainerSamples)
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<containerSample>(destinationContainerSamples)

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<cellSample>({})

    const [placementType, setPlacementType] = useState<string>('single')
    const [placementOrder, setPlacementOrder] = useState<boolean>(false)
    const [placementDirection, setPlacementDirection] = useState<string>('row')


    useEffect(() => {
        const clearedSource = clear(sourceContainerSamples.samples)
        setSourceSamples({ ...sourceContainerSamples, samples: clearedSource })

    }, [sourceContainerSamples.samples])

    useEffect(() => {
        const clearedDestination = clear(destinationContainerSamples.samples)
        setDestinationSamples({ ...destinationContainerSamples, samples: clearedDestination })

    }, [destinationContainerSamples.samples])

    const copyKeyObject = useCallback((obj) => {
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

    }, [sourceSamples, destinationSamples])

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [placementType])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [placementDirection])

    const updatePlacementOrder = useCallback((value) => {
        setPlacementOrder(value)
    }, [placementOrder])

    const placeGroupSamples = useCallback((sampleObj: cellSample) => {

        let coordinates = Object.keys(sampleObj).map((key) => key)
        if (placementOrder) {
            coordinates = coordinates.reverse()
        }

        const error = (coordinates.some((coord) => Object.values(destinationSamples.samples).find(sample => sample.coordinate == coord)))

        if (!error)
            updateSampleList(coordinates.map(coord => { return { id: undefined, type: undefined, coordinate: coord } }), 'destination')


    }, [sourceSamples, placementOrder])

    const sampleInCoords = useCallback((source, destination) => {
        console.log(source, destination)
        const value = (Object.values(source).some(
            (sourceSample: any) =>
                Object.values(destination).find(
                    (destinationSample: any) => destinationSample.coordinate == sourceSample.coordinate
                )
        ))

        return value
    }, [])

    const transferAllSamples = useCallback(() => {
        //sets all samples to certain type
        const setType = (type, source, destination) => {
            Object.keys(source).forEach((id) => {
                if (source[id].type == 'none')
                    destination[id] = { coordinate: source[id].coordinate, type: type }
            })
            return destination
        }


        const newSourceSamples = setType('placed', sourceSamples.samples, copyKeyObject(sourceSamples.samples))
        const newDestinationSamples = setType('none', sourceSamples.samples, copyKeyObject(destinationSamples.samples))

        // console.log(sourceSamples.samples, destinationSamples.samples)
        if (!sampleInCoords(sourceSamples.samples, destinationSamples.samples)) {
            setSourceSamples({ ...sourceSamples, samples: newSourceSamples })
            setDestinationSamples({ ...destinationSamples, samples: newDestinationSamples })
            saveContainerSamples(newSourceSamples, newDestinationSamples)
        }
    }, [sourceSamples.samples, destinationSamples.samples])

    const clear = useCallback((oldSamples: cellSample) => {
        const newSamples = {}
        Object.keys(oldSamples).forEach(id => {
            newSamples[id] = { ...oldSamples[id], type: oldSamples[id].type == 'selected' ? 'none' : oldSamples[id].type }
        })
        return newSamples
    }, [])

    const clearSelection = useCallback(() => {
        const clearedSource = clear(sourceSamples.samples)
        const clearedDestination = clear(destinationSamples.samples)

        setSourceSamples({ ...sourceSamples, samples: clearedSource })
        setDestinationSamples({ ...destinationSamples, samples: clearedDestination })
        setSelectedSamples({})
        saveContainerSamples(clearedSource, clearedDestination)
    }, [sourceSamples.samples, destinationSamples.samples])

    const changeContainer = useCallback((number: string, name: string, type) => {
        //clears selection depending on cycle type
        cycleContainer(number, name, type)
    }, [cycleContainer])

    const updateSampleList = useCallback((sampleList, containerType) => {
        let tempSelectedSamples = { ...selectedSamples }
        const tempSourceSamples = copyKeyObject(sourceSamples.samples)
        const tempDestinationSamples = copyKeyObject(destinationSamples.samples)

        const checkSampleType = (type) => type == 'none' ? 'selected' : 'none'
        sampleList.forEach(sample => {
            const id = sample.id
            const coord = sample.coordinate
            //if container is source
            if (containerType == "source" && tempSourceSamples[id] && sample.type != 'placed') {
                //changes type to source while selecting, if placed cannot select
                tempSourceSamples[id].type = checkSampleType(tempSourceSamples[id].type)
            }

            //if container is destination
            if (containerType == "destination") {
                //if exists in destination set to none or selected based on current type
                if (tempDestinationSamples[id]) {

                    tempDestinationSamples[id].type = checkSampleType(tempDestinationSamples[id].type)
                }
                else {
                    //placing selected samples into destination and setting sourceSamples to 'PLACED'
                    const selectedId: any = Object.keys(tempSelectedSamples)[0]

                    if (selectedId) {
                        //if id exists in selectedSamples is selected from destination then move from destination
                        if (tempSelectedSamples[selectedId].type == 'destination') {
                            delete tempDestinationSamples[selectedId]
                        }

                        tempDestinationSamples[selectedId] = { coordinate: sample.coordinate, type: 'none' }

                        if (tempSourceSamples[selectedId]) {
                            //if id exists in source, set sample to placed
                            tempSourceSamples[selectedId].type = 'placed'
                        }
                        //removes from selected samples
                        // tempSelectedSamples = tempSelectedSamples.filter(sample => sample.id != selected.id)
                        delete tempSelectedSamples[selectedId]
                    }
                }
            }
            //if sample id exists, it delete in selectedSamples, else adds it to selected samples object
            if (id && sample.type != 'placed') {
                if (tempSelectedSamples[id]) {
                    delete tempSelectedSamples[id]
                    // tempSelectedSamples = tempSelectedSamples.filter(sample => sample.id != id)
                } else {

                    tempSelectedSamples[id] = { coordinate: coord, type: containerType }
                }
            }
        })

        //updates state
        setSourceSamples({ ...sourceSamples, samples: tempSourceSamples })
        setSelectedSamples({ ...tempSelectedSamples })
        setDestinationSamples({ ...destinationSamples, samples: tempDestinationSamples })

        //updates samples to parent container
        saveContainerSamples(tempSourceSamples, tempDestinationSamples)

    }, [sourceSamples.samples, destinationSamples.samples])


    const onSampleSelect = useCallback((sample) => {
        let selectedSampleList = sample.map(sample => { return { ...sample.sample } })
        selectedSampleList.filter(sample => selectedSamples[sample.id])
        let ids: any = [];

        if (selectedSampleList.length == 0) {
            //removes selected if array is empty
            Object.keys(selectedSamples).forEach(id => {
                ids.push({ id })
            })
        }
        else if (selectedSampleList.length < Object.keys(selectedSamples).length) {
            //finds removed id from the selection from antd table
            const id = Object.keys(selectedSamples).filter(x => !selectedSampleList.map((sample) => sample.id).includes(x))[0];
            ids.push({ id })
        } else {
            //gets the newly added sample from the selection from the antd table
            selectedSampleList.forEach(sample => {
                if (sample.type != 'selected' && sample.type != 'placed') {
                    ids.push({ id: sample.id })
                }
            })
        }
        updateSampleList(ids, 'source')
    }, [sourceSamples.samples, selectedSamples])

    const filterPlacedSamples = useCallback((samples) => {
        const filtered: any = []
        Object.keys(samples).map(id => {
            if (samples[id].type != 'placed')
                filtered.push({ sample: { id: id, type: samples[id].type } })
        })
        return filtered
    }, [])


    return (
        <>
            <PageContainer>
                <PageContent>
                    <div className={"flex-column"}>
                        <div className={"flex-column"} style={{ alignItems: 'center' }}>
                            <Text> Placement </Text>
                            <Radio.Group value={placementType} onChange={evt => updatePlacementType(evt.target.value)}>
                                <Radio.Button value={'single'}> Single </Radio.Button>
                                <Radio.Button value={'group'}> Group </Radio.Button>
                            </Radio.Group>
                        </div>
                        <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center' }}>
                            <Radio.Group
                                disabled={placementType == 'single'}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
                            <div className={"flex-row"}>
                                <Text>
                                    Reverse Order
                                </Text>
                                <Switch
                                    disabled={placementType == 'single'}
                                    checked={placementOrder}
                                    onChange={updatePlacementOrder}
                                    title='Reverse Placement order'
                                />
                            </div>
                        </div>
                        <div className={"flex-row"}>
                            <div className={"flex-column"}>
                                <ContainerNameScroller
                                    type={"source"}
                                    name={sourceSamples.containerName}
                                    changeContainer={changeContainer} />
                                <TransferContainer
                                    containerType={"source"}
                                    columns={sourceSamples.columns}
                                    rows={sourceSamples.rows}
                                    samples={sourceSamples.samples}
                                    updateSample={updateSampleList} />
                            </div>
                            <div className={"flex-column"}>
                                <ContainerNameScroller type="destination"
                                    name={destinationSamples.containerName}
                                    changeContainer={changeContainer}
                                    changeContainerName={() => { }} />
                                <TransferContainer
                                    containerType={"destination"}
                                    selectedSamples={Object.keys(selectedSamples).length}
                                    columns={destinationSamples.columns}
                                    rows={destinationSamples.rows}
                                    samples={destinationSamples.samples}
                                    updateSample={updateSampleList}
                                    updateSampleGroup={placeGroupSamples}
                                    direction={placementType == 'group' ? placementDirection : undefined} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'end', gap: '1vw' }}>
                            <Button onClick={transferAllSamples}>Transfer All</Button>
                            <Button onClick={() => clearSelection()}>Clear Selection</Button>
                            <Button onClick={addDestination}>Add Container</Button>
                        </div>
                        <div className={"flex-row"}>
                            <LibraryTransferTable onSampleSelect={onSampleSelect} samples={filterPlacedSamples(sourceSamples.samples)} />
                            <LibraryTransferTable onSampleSelect={onSampleSelect} samples={filterPlacedSamples(destinationSamples.samples)} />
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer