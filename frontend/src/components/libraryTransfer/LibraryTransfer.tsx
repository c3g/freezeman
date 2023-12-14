import React, { useEffect, useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Typography, Switch } from 'antd'
import { cellSample, containerSample, sampleInfo } from "./LibraryTransferStep"
const { Text } = Typography;

interface LibraryTransferProps {
    sourceContainerSamples: containerSample,
    destinationContainerSamples: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples) => void,
    cycleContainer: (number, containerName, type) => void,
    addDestination: () => void
}


const LibraryTransfer = ({ sourceContainerSamples, destinationContainerSamples, cycleContainer, saveChanges, addDestination }: LibraryTransferProps) => {

    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<containerSample>(sourceContainerSamples)
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<containerSample>(destinationContainerSamples)

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<any[]>([])

    const [placementType, setPlacementType] = useState<string>('single')
    const [placementOrder, setPlacementOrder] = useState<boolean>(false)
    const [placementDirection, setPlacementDirection] = useState<string>('row')


    useEffect(() => {
        setSourceSamples(sourceContainerSamples)
        setDestinationSamples(destinationContainerSamples)

    }, [sourceContainerSamples, destinationContainerSamples])

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
            updateSampleList(coordinates.map(coord => { return { sampleID: undefined, type: undefined, coordinate: coord } }), 'destination')


    }, [sourceSamples, placementOrder])

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

        if (!Object.keys(newSourceSamples).some(id => destinationSamples.samples[id])) {
            setSourceSamples({ ...sourceSamples, samples: newSourceSamples })
            setDestinationSamples({ ...destinationSamples, samples: newDestinationSamples })
            saveContainerSamples(newSourceSamples, newDestinationSamples)
        }
    }, [sourceSamples.samples, destinationSamples.samples])

    const clearSelection = useCallback(() => {
        const clear = (oldSamples: cellSample) => {
            const newSamples = {}
            Object.keys(oldSamples).forEach(id => {
                newSamples[id] = { ...oldSamples[id], type: oldSamples[id].type == 'selected' ? 'none' : oldSamples[id].type }
            })
            return newSamples
        }
        const clearedSource = clear(sourceSamples.samples)
        const clearedDestination = clear(destinationSamples.samples)


        setSourceSamples({ ...sourceSamples, samples: clearedSource })
        setDestinationSamples({ ...destinationSamples, samples: clearedDestination })
        setSelectedSamples([])
        saveContainerSamples(clearedSource, clearedDestination)
    }, [sourceSamples.samples, destinationSamples.samples])

    const changeContainer = useCallback((number: string, name: string, type) => {
        //clears selection depending on cycle type
        clearSelection()
        cycleContainer(number, name, type)
    }, [cycleContainer, clearSelection])

    const updateSampleList = useCallback((sampleList, containerType) => {
        let tempSelectedSamples: any[] = [...selectedSamples]
        const tempSourceSamples = copyKeyObject(sourceSamples.samples)
        const tempDestinationSamples = copyKeyObject(destinationSamples.samples)

        const checkSampleType = (type) => type == 'none' ? 'selected' : 'none'
        sampleList.forEach(sample => {
            const sampleID = sample.sampleID
            const coord = sample.coordinate
            //if container is source
            if (containerType == "source" && tempSourceSamples[sampleID] && sample.type != 'placed') {
                //changes type to source while selecting, if placed cannot select
                tempSourceSamples[sampleID].type = checkSampleType(tempSourceSamples[sampleID].type)
            }

            //if container is destination
            if (containerType == "destination") {
                //if exists in destination set to none or selected based on current type
                if (tempDestinationSamples[sampleID]) {

                    tempDestinationSamples[sampleID].type = checkSampleType(tempDestinationSamples[sampleID].type)
                }
                else {
                    //placing selected samples into destination and setting sourceSamples to 'PLACED'
                    const selected: any = tempSelectedSamples[0]

                    if (selected) {
                        //if id exists in selectedSamples is selected from destination then move from destination
                        if (selected.containerType == 'destination') {
                            delete tempDestinationSamples[selected.sampleID]
                        }
                        
                        tempDestinationSamples[selected.sampleID] = { coordinate: sample.coordinate, type: 'none' }
                        
                        if (tempSourceSamples[selected.sampleID]) {
                            //if id exists in source, set sample to placed
                            tempSourceSamples[selected.sampleID].type = 'placed'
                        }
                        //removes from selected samples
                        tempSelectedSamples = tempSelectedSamples.filter(sample => sample.sampleID != selected.sampleID)

                    }
                }
            }
            //if sample id exists, it delete in selectedSamples, else adds it to selected samples object
            if (sampleID && sample.type != 'placed') {
                if (tempSelectedSamples.find(sample => sample.sampleID == sampleID)) {
                    tempSelectedSamples = tempSelectedSamples.filter(sample => sample.sampleID != sampleID)
                } else {
                    tempSelectedSamples.push({ coordinate: coord, containerType: containerType, sampleID: sampleID })
                }
            }
        })

        //updates state
        setSourceSamples({ ...sourceSamples, samples: tempSourceSamples })
        setSelectedSamples([...tempSelectedSamples])
        setDestinationSamples({ ...destinationSamples, samples: tempDestinationSamples })

        //updates samples to parent container
        saveContainerSamples(tempSourceSamples, tempDestinationSamples)

    }, [sourceSamples.samples, destinationSamples.samples])


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
                                    selectedSamples={selectedSamples.length}
                                    columns={destinationSamples.columns}
                                    rows={destinationSamples.rows}
                                    samples={destinationSamples.samples}
                                    updateSample={updateSampleList}
                                    updateSampleList={placeGroupSamples}
                                    direction={placementType == 'group' ? placementDirection : undefined} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'end', gap: '1vw' }}>
                            <Button onClick={transferAllSamples}>Transfer All</Button>
                            <Button onClick={() => clearSelection()}>Clear Selection</Button>
                            <Button onClick={addDestination}>Add Container</Button>
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer