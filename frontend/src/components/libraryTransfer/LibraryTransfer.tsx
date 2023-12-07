import React, { useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button } from 'antd'
import {
    sortableContainer,
    sortableElement,
    sortableHandle
} from "react-sortable-hoc";

const LibraryTransfer = () => {
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<any>({ 'a_1': { sampleID: 1, type: 'none' }, 'a_2': { sampleID: 2, type: 'none' }, 'a_3': { sampleID: 3, type: 'none' } })

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<any>({})

    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<any>({})

    const [placementType, setPlacementType] = useState<String>('single')
    const [placementDirection, setPlacementDirection] = useState<String>('row')

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [placementType])

    const updatePlacementDirection = useCallback((value) => {
        setPlacementDirection(value)
    }, [placementDirection])


    const placeGroupSamples = (sampleObj) => {
        const tempDestinationSamples = { ...destinationSamples }
        //checks if preceding columns are free
        const coordinates = Object.keys(sampleObj)
        let sampleList = []
        const error = false;

        if (placementDirection == 'row') {
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

        } else {

        }
        //checks if preceding rows are free

    }

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



    const updateSampleList = useCallback((sampleList, containerType) => {

        const tempSelectedSamples = { ...selectedSamples }
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
                    const key = Object.keys(tempSelectedSamples)[0]

                    if (key) {
                        tempDestinationSamples[coord] = { sampleID: key, type: 'none' }
                        //if id exists in selectedSamples is selected from destination then move from destination
                        if (tempSelectedSamples[key].containerType == 'destination') {
                            delete tempDestinationSamples[tempSelectedSamples[key].coordinate]
                        } else {
                            //if id exists in source, set sample to placed
                            tempSourceSamples[tempSelectedSamples[key].coordinate].type = 'placed'
                        }

                        delete tempSelectedSamples[key]
                    }
                }
            }

            //if sample id exists, it delete in selectedSamples, else adds it to selected samples object
            if (sampleID) {
                if (tempSelectedSamples[sampleID]) {
                    delete tempSelectedSamples[sampleID]
                } else {
                    tempSelectedSamples[sampleID] = { coordinate: coord, containerType: containerType }
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <Button onClick={transferAllSamples}>Transfer All</Button>
                            <Button onClick={() => { }}> Clear Selection</Button>
                            {/* <button onClick={}> Group Select</button> */}
                            <Radio.Group value={placementType} onChange={evt => updatePlacementType(evt.target.value)}>
                                <Radio.Button value={'single'}> Single Placement </Radio.Button>
                                <Radio.Button value={'group'}> Group Placement </Radio.Button>
                            </Radio.Group>
                            <Radio.Group
                                disabled={placementType == 'single'}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> Row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '10%', }}>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller />
                                <TransferContainer
                                    containerType={"source"}
                                    columns={12} rows={8}
                                    samples={sourceSamples}
                                    updateSampleList={updateSampleList}></TransferContainer>
                            </div>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller />
                                <TransferContainer
                                    containerType={"destination"}
                                    selectedSamples={Object.keys(selectedSamples).length}
                                    columns={12} rows={8} samples={destinationSamples}
                                    updateSampleList={updateSampleList}
                                    updateSamples={placeGroupSamples}
                                    groupPlace={placementType == 'group'}
                                    direction={placementType == 'group' ? placementDirection : ''}></TransferContainer>
                            </div>
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer