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

    const updatePlacementType = useCallback((value) => {
        setPlacementType(value)
    }, [placementType])

    const transferAllSamples = useCallback(() => {

        let tempDestinationSamples = { ...sourceSamples }

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


    const updateSamples = useCallback((sample, containerType) => {
        const coord = sample.coordinate
        console.log(sample, containerType)
        const tempSelectedSamples = { ...selectedSamples }
        const tempSourceSamples = { ...sourceSamples }
        const tempDestinationSamples = { ...destinationSamples }
        const sampleID = sample.sampleID

        if (containerType == "source" && tempSourceSamples[coord]) {

            if (tempSourceSamples[coord].type != 'placed') {
                if (tempSourceSamples[coord].type == "none") {
                    tempSourceSamples[coord].type = 'selected'
                } else {
                    tempSourceSamples[coord].type = "none"
                }
            }
        }

        // console.log(isSelecting)
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

                if (!tempDestinationSamples[coord] && key) {
                    tempDestinationSamples[coord] = { sampleID: key, type: 'none' }

                    if (tempSelectedSamples[key].containerType == 'destination') {
                        delete tempDestinationSamples[tempSelectedSamples[key].coordinate]
                    } else {
                        tempSourceSamples[tempSelectedSamples[key].coordinate].type = 'placed'
                    }
                    delete tempSelectedSamples[key]
                }
            }
        }

        if (sampleID) {
            if (tempSelectedSamples[sampleID]) {
                delete tempSelectedSamples[sampleID]
            } else {
                tempSelectedSamples[sampleID] = { coordinate: coord, containerType: containerType }
            }
        }
        console.log(tempSelectedSamples)
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
                            {/* <button onClick={}> Group Select</button> */}
                            <Radio.Group value={placementType} onChange={evt => updatePlacementType(evt.target.value)}>
                                <Radio.Button value={'single'}> Single Placement </Radio.Button>
                                <Radio.Button value={'group'}> Group Placement </Radio.Button>
                            </Radio.Group>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '10%', }}>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller />
                                <TransferContainer containerType={"source"} columns={12} rows={8} samples={sourceSamples} updateSamples={updateSamples}></TransferContainer>
                            </div>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller />
                                <TransferContainer containerType={"destination"} selected={Object.keys(selectedSamples)} columns={12} rows={8} samples={destinationSamples} updateSamples={updateSamples}></TransferContainer>
                            </div>
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer