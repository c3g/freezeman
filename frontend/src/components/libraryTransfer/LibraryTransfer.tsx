import React, { useEffect, useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Typography } from 'antd'
import { DESTINATION_STRING, NONE_STRING, PLACED_STRING, SOURCE_STRING, cellSample, containerSample } from "./LibraryTransferStep"
import LibraryTransferTable from "./LibraryTransferTable"
const { Text } = Typography;

interface LibraryTransferProps {
    sourceContainerSamples: containerSample,
    destinationContainerSamples: containerSample,
    saveChanges: (sourceContainerSamples, destinationContainerSamples) => void,
    cycleContainer: (number, name, type) => void,
    addDestination: () => void,
    disableChangeSource: boolean,
    disableChangeDestination: boolean
}

const LibraryTransfer = ({ sourceContainerSamples, destinationContainerSamples, cycleContainer, saveChanges, addDestination, disableChangeSource, disableChangeDestination }: LibraryTransferProps) => {

    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<containerSample>(sourceContainerSamples)
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<containerSample>(destinationContainerSamples)

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<cellSample>({})

    const [placementType, setPlacementType] = useState<string>('single')
    const [placementDirection, setPlacementDirection] = useState<string>('row')


    useEffect(() => {
        setSourceSamples({ ...sourceContainerSamples, samples: sourceContainerSamples.samples })
    }, [sourceContainerSamples.samples, sourceContainerSamples.containerName])

    useEffect(() => {
        setDestinationSamples({ ...destinationContainerSamples, samples: destinationContainerSamples.samples })
    }, [destinationContainerSamples.samples, destinationContainerSamples.containerName])

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

    }, [sourceSamples, destinationSamples])

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [placementType])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [placementDirection])


    const placeGroupSamples = useCallback((sampleObj: cellSample) => {

        let coordinates = Object.keys(sampleObj).map((key) => key)

        const error = (coordinates.some((coord) => Object.values(destinationSamples.samples).find(sample => sample.coordinate == coord)))

        if (!error)
            updateSampleList(coordinates.map(coord => { return { id: undefined, type: undefined, coordinate: coord } }), DESTINATION_STRING)


    }, [sourceSamples])

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

    const changeContainer = useCallback((number: string, name: string, type) => {
        //clears selection depending on cycle type
        cycleContainer(number, name, type)
        setSelectedSamples({})
    }, [cycleContainer])

    const updateSampleList = useCallback((sampleList, containerType) => {
        const tempSelectedSamples: cellSample = copyKeyObject(selectedSamples)
        const tempSourceSamples: containerSample = copyKeyObject(sourceSamples.samples)
        const tempDestinationSamples: containerSample = copyKeyObject(destinationSamples.samples)

        sampleList.forEach(sample => {
            const id = sample.id
            const coord = sample.coordinate

            //if container is destination, also to prevent users from placing into empty cells in source container
            if (containerType == DESTINATION_STRING) {
                if (!tempDestinationSamples[id]) {
                    //placing selected samples into destination and setting sourceSamples to 'PLACED'
                    const selectedId: number = parseInt(Object.keys(tempSelectedSamples)[0])
                    if (selectedId) {
                        //if id exists in selectedSamples is selected from destination then move from destination
                        if (tempSelectedSamples[selectedId].type == DESTINATION_STRING) {
                            delete tempDestinationSamples[selectedId]
                        }
                        tempDestinationSamples[selectedId] = { coordinate: sample.coordinate, type: NONE_STRING, sourceContainer: tempSourceSamples.containerName }

                        if (tempSourceSamples[selectedId]) {
                            //if id exists in source, set sample to placed
                            tempSourceSamples[selectedId].type = PLACED_STRING
                        }

                        //removes from selected samples
                        delete tempSelectedSamples[selectedId]

                    }
                }
            }
            //if sample id exists, it delete in selectedSamples, else adds it to selected samples object
            if (id && sample.type != PLACED_STRING) {
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
    }, [sourceSamples.samples, destinationSamples.samples, selectedSamples])


    const onSampleSelect = useCallback((samples, type) => {
        let selectedSampleList = samples.map(sample => { return { ...sample.sample } })
        //get selected samples for respective table
        const filteredSelected = Object.keys(selectedSamples).filter(id => selectedSamples[id].type == type)
        let ids: any = [];
        if (selectedSampleList.length == 0) {
            //removes selected if array is empty
            filteredSelected.forEach(id => {
                ids.push({ id })
            })
        }
        else if (selectedSampleList.length < filteredSelected.length) {
            //finds removed id from the selection from antd table
            const id = filteredSelected.filter(x =>
                !selectedSampleList.map((sample) =>
                    sample.id).includes(x)
            )[0];

            ids.push({ id })
        }
        else {
            //gets the newly added sample from the selection from the antd table
            selectedSampleList.forEach(sample => {
                if (sample.type != PLACED_STRING && !filteredSelected.includes(sample.id)) {
                    ids.push({ id: sample.id })
                }
            })
        }
        updateSampleList(ids, type)
    }, [sourceSamples, destinationSamples, selectedSamples])

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
                                <Radio.Button value={'single'}> Single </Radio.Button>
                                <Radio.Button value={'group'}> Group </Radio.Button>
                            </Radio.Group>
                            <Radio.Group
                                disabled={placementType == 'single'}
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
                                    type={SOURCE_STRING}
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
                                    type={DESTINATION_STRING}
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
                                    direction={placementType == 'group' ? placementDirection : undefined} />
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