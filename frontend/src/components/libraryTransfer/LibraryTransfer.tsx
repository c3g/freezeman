import React, { useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Typography, Switch } from 'antd'
import {
    sortableContainer,
    sortableElement,
    sortableHandle
} from "react-sortable-hoc";

const { Text } = Typography;

const LibraryTransfer = () => {
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<any>({ 'a_1': { sampleID: 99, type: 'none' }, 'a_2': { sampleID: 2, type: 'none' }, 'a_3': { sampleID: 48, type: 'none' }, 'a_5': { sampleID: 44, type: 'none' }, 'b_1': { sampleID: 8, type: 'none' }, 'b_2': { sampleID: 81, type: 'none' }, 'b_3': { sampleID: 82, type: 'none' }, 'b_4': { sampleID: 83, type: 'none' }, })

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<[]>([])

    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<any>({})

    const [placementType, setPlacementType] = useState<String>('single')
    const [placementOrder, setPlacementOrder] = useState<boolean>(false)
    const [placementDirection, setPlacementDirection] = useState<String>('row')

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [placementType])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [placementDirection])

    const updatePlacementOrder = useCallback((value) => {
        setPlacementOrder(value)
    }, [placementOrder])

    const placeGroupSamples = useCallback((sampleObj) => {
        const tempDestinationSamples = { ...destinationSamples }
        let coordinates = Object.keys(sampleObj)
        let sampleList = []
        let error = false;

        if (placementOrder) {
            coordinates = coordinates.reverse()
        }

        //create sampleList to push 
        coordinates.forEach(coord => {
            if (tempDestinationSamples[coord]) {
                error = true;
            } else {
                sampleList.push({ sampleID: undefined, type: undefined, coordinate: coord })
            }
        })

        if (!error) {
            updateSampleList(sampleList, 'destination')
        }

    }, [sourceSamples, placementOrder])

    const transferAllSamples = useCallback(() => {
        let tempDestinationSamples = {}
        let tempSourceSamples = {}

        Object.keys(sourceSamples).forEach(coordinate => {
            tempSourceSamples[coordinate] = { ...sourceSamples[coordinate], type: 'placed' }
        })
        Object.keys(sourceSamples).forEach(coordinate => {
            tempDestinationSamples[coordinate] = { ...sourceSamples[coordinate], type: 'none' }
        })

        setSourceSamples({ ...tempSourceSamples })
        setDestinationSamples({ ...tempDestinationSamples })
    }, [sourceSamples])

    const clearSelection = useCallback(() => {
        const tempSourceSamples = {}
        const tempDestinationSamples = {}
        Object.keys(sourceSamples).forEach(coordinate => {
            tempSourceSamples[coordinate] = { ...sourceSamples[coordinate], type: sourceSamples[coordinate].type == 'selected' ? 'none' : sourceSamples[coordinate].type }
        })
        Object.keys(destinationSamples).forEach(coordinate => {
            tempDestinationSamples[coordinate] = { ...destinationSamples[coordinate], type: 'none' }
        })

        setSourceSamples(tempSourceSamples)
        setDestinationSamples(tempDestinationSamples)
        setSelectedSamples([])
    }, [sourceSamples, destinationSamples])



    const updateSampleList = useCallback((sampleList, containerType) => {
        let tempSelectedSamples = [...selectedSamples]
        const tempSourceSamples = { ...sourceSamples }
        const tempDestinationSamples = { ...destinationSamples }

        sampleList.forEach(sample => {
            const sampleID = sample.sampleID
            const coord = sample.coordinate
            //if container is source
            if (containerType == "source" && tempSourceSamples[coord]) {
                //changes type to source while selecting, if placed cannot select
                if (tempSourceSamples[coord].type != 'placed') {
                    if (tempSourceSamples[coord].type == "none") {
                        tempSourceSamples[coord].type = 'selected'
                    } else {
                        tempSourceSamples[coord].type = "none"
                    }
                }
            }

            //if container is destination
            if (containerType == "destination") {

                if (tempDestinationSamples[coord]) {
                    if (tempDestinationSamples[coord].type == "none") {
                        tempDestinationSamples[coord].type = 'selected'
                    }
                    else {
                        tempDestinationSamples[coord].type = 'none'
                    }
                }
                else {
                    //placing selected samples into destination and setting sourceSamples to 'PLACED'
                    const selected = tempSelectedSamples[0]
                    if (selected) {
                        tempDestinationSamples[coord] = { sampleID: selected.sampleID, type: 'none' }
                        //if id exists in selectedSamples is selected from destination then move from destination
                        if (selected.containerType == 'destination') {
                            delete tempDestinationSamples[selected.coordinate]
                        } else {
                            //if id exists in source, set sample to placed
                            tempSourceSamples[selected.coordinate].type = 'placed'
                        }

                        tempSelectedSamples = tempSelectedSamples.filter(sample => sample.sampleID != selected.sampleID)
                    }
                }
            }

            //if sample id exists, it delete in selectedSamples, else adds it to selected samples object
            if (sampleID) {
                if (tempSelectedSamples.find(sample => sample.sampleID == sampleID)) {
                    tempSelectedSamples = tempSelectedSamples.filter(sample => sample.sampleID != sampleID)
                } else {
                    tempSelectedSamples.push({ coordinate: coord, containerType: containerType, sampleID: sampleID })
                }
            }
        })
        //update source Samples to selected, placed
        setSourceSamples(tempSourceSamples)
        setSelectedSamples(tempSelectedSamples)
        setDestinationSamples(tempDestinationSamples)
    }, [sourceSamples, destinationSamples])


    return (
        <>
            <PageContainer>
                <PageContent>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2vw' }}>
                            <Radio.Group value={placementType} onChange={evt => updatePlacementType(evt.target.value)}>
                                <Radio.Button value={'single'}> Single Placement </Radio.Button>
                                <Radio.Button value={'group'}> Group Placement </Radio.Button>
                            </Radio.Group>
                        </div>
                        <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center' }}>
                            <Radio.Group
                                disabled={placementType == 'single'}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> Row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
                            <div style={{ display: 'flex', gap: '1vw', flexDirection: 'row' }}>
                                <Text>
                                    Reverse Placement Order
                                </Text>
                                <Switch
                                    disabled={placementType == 'single'}
                                    checked={placementOrder}
                                    onChange={updatePlacementOrder}
                                    title='Reverse Placement order'
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '10%', }}>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller />
                                <TransferContainer
                                    containerType={"source"}
                                    columns={12} rows={8}
                                    samples={sourceSamples}
                                    updateSample={updateSampleList}></TransferContainer>
                            </div>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller />
                                <TransferContainer
                                    containerType={"destination"}
                                    selectedSamples={Object.keys(selectedSamples).length}
                                    columns={12} rows={8} samples={destinationSamples}
                                    updateSample={updateSampleList}
                                    updateSampleList={placeGroupSamples}
                                    groupPlace={placementType == 'group'}
                                    direction={placementType == 'group' ? placementDirection : ''}></TransferContainer>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'end', gap: '1vw' }}>
                            <Text>Samples are placed in order of selection</Text>
                            <Button onClick={transferAllSamples}>Transfer All</Button>
                            <Button onClick={clearSelection}> Clear Selection</Button>
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer