import React, { useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"

const LibraryTransfer = () => {
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<any>({ 'a_1': { sampleID: 1, type: 'none' }, 'a_2': { sampleID: 2, type: 'none' }, 'a_3': { sampleID: 3, type: 'none' } })

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<any>({})

    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<any>({})

    const updatePlacementType = useCallback(() => {

    }, [])

    const updateSamples = useCallback((sampleList, containerType) => {
        const sampleID = sampleList.sampleID
        const coord = sampleList.coordinate
        
        let tempSelectedSamples = { ...selectedSamples }
        let tempSourceSamples = { ...sourceSamples }
        let tempDestinationSamples = { ...destinationSamples }

        if (containerType == "source") {
            if (tempSourceSamples[coord].type != 'placed') {
                if (tempSourceSamples[coord].type == "none") {
                    tempSourceSamples[coord].type = 'selected'
                }
                else {
                    tempSourceSamples[coord].type = 'none'
                }
            }
        }
        if (containerType == "destination") {

            if (tempDestinationSamples[coord]) {
                if (tempDestinationSamples[coord].type == "none") {
                    tempDestinationSamples[coord].type = 'selected'
                }
                else {
                    tempDestinationSamples[coord].type = 'none'
                }
            } else {
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
        console.log('aaa')
        //update source Samples to selected, placed
        setSourceSamples(tempSourceSamples)
        setSelectedSamples(tempSelectedSamples)
        setDestinationSamples(tempDestinationSamples)
    }, [sourceSamples, destinationSamples])
    return (
        <>
            <PageContainer>
                <PageContent>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '10%', }}>
                        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                            <ContainerNameScroller />
                            <TransferContainer containerType={"source"} columns={12} rows={8} samples={sourceSamples} updateSamples={updateSamples}></TransferContainer>
                        </div>
                        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                            <ContainerNameScroller />
                            <TransferContainer containerType={"destination"} columns={12} rows={8} samples={destinationSamples} updateSamples={updateSamples}></TransferContainer>
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer