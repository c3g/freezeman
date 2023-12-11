import React, { useEffect, useState } from "react"
import TransferContainer from "./TransferContainer"
import PageContent from "../PageContent"
import PageContainer from "../PageContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import { useCallback } from "react"
import { Radio, Button, Typography, Switch } from 'antd'
const { Text } = Typography;

interface LibraryTransferProps {
    sourceContainerSamples: any,
    destinationContainerSamples: any,
    updateContainerSamples: () => void,
    cycleContainer: (number, containerName, type) => void
}


const LibraryTransfer = ({ sourceContainerSamples, destinationContainerSamples, cycleContainer, updateContainerSamples }: LibraryTransferProps) => {

    const copyObject = useCallback((obj) => {
        return JSON.parse(JSON.stringify(obj))
    }, [])
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [sourceSamples, setSourceSamples] = useState<any>(copyObject(sourceContainerSamples))
    // keyed object by coordinate, containing sample id and type, to indicate to user if sample is placed in destination or in selection
    const [destinationSamples, setDestinationSamples] = useState<any>({})

    //keyed object by sampleID, containing the coordinate
    const [selectedSamples, setSelectedSamples] = useState<any[]>([])

    const [placementType, setPlacementType] = useState<string>('single')
    const [placementOrder, setPlacementOrder] = useState<boolean>(false)
    const [placementDirection, setPlacementDirection] = useState<string>('row')

    useEffect(() => {
        setSourceSamples(copyObject(sourceContainerSamples))
        setDestinationSamples(copyObject(destinationContainerSamples))
        setSelectedSamples([])
    }, [sourceContainerSamples.samples, destinationContainerSamples.samples])


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
        const tempDestinationSamples = destinationSamples.samples
        let coordinates = Object.keys(sampleObj)
        const sampleList: any[] = []
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

    const changeContainer = useCallback((number: number, name: string, type) => {
        cycleContainer(number, name, type)
    }, [cycleContainer])

    const transferAllSamples = useCallback(() => {
        const tempDestinationSamples = {}
        const tempSourceSamples = {}

        Object.keys(sourceSamples.samples).forEach(coordinate => {
            tempSourceSamples[coordinate] = { ...sourceSamples.samples[coordinate], type: 'placed' }
        })
        Object.keys(sourceSamples.samples).forEach(coordinate => {
            tempDestinationSamples[coordinate] = { ...sourceSamples.samples[coordinate], type: 'none' }
        })

        setSourceSamples({ ...sourceSamples, samples: tempSourceSamples })
        setDestinationSamples({ ...destinationSamples, samples: tempDestinationSamples })
    }, [sourceSamples.samples])

    const clearSelection = useCallback(() => {
        const tempSourceSamples = {}
        const tempDestinationSamples = {}
        Object.keys(sourceSamples.samples).forEach(coordinate => {
            tempSourceSamples[coordinate] = { ...sourceSamples.samples[coordinate], type: sourceSamples.samples[coordinate].type == 'selected' ? 'none' : sourceSamples.samples[coordinate].type }
        })
        Object.keys(destinationSamples.samples).forEach(coordinate => {
            tempDestinationSamples[coordinate] = { ...destinationSamples.samples[coordinate], type: 'none' }
        })

        setSourceSamples({ ...sourceSamples, samples: { ...tempSourceSamples } })
        setDestinationSamples({ ...destinationSamples, samples: { ...tempDestinationSamples } })
        setSelectedSamples([])
    }, [sourceSamples.samples, destinationSamples.samples])



    const updateSampleList = useCallback((sampleList, containerType) => {
        let tempSelectedSamples: any[] = [...selectedSamples]
        const tempSourceSamples = copyObject(sourceSamples.samples)
        const tempDestinationSamples = copyObject(destinationSamples.samples)

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
                    const selected: any = tempSelectedSamples[0]
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
        setSourceSamples({ ...sourceSamples, samples: tempSourceSamples })
        setSelectedSamples([...tempSelectedSamples])
        setDestinationSamples({ ...destinationSamples, samples: tempDestinationSamples })

    }, [sourceSamples.samples, destinationSamples.samples])

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
                                <ContainerNameScroller type={"source"} name={sourceSamples.containerName} changeContainer={changeContainer} />
                                <TransferContainer
                                    containerType={"source"}
                                    columns={12} rows={8}
                                    samples={sourceSamples.samples}
                                    updateSample={updateSampleList} />
                            </div>
                            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                                <ContainerNameScroller type="destination" name={destinationSamples.containerName} changeContainer={changeContainer} changeContainerName={() => { }} />
                                <TransferContainer
                                    containerType={"destination"}
                                    selectedSamples={Object.keys(selectedSamples).length}
                                    columns={12} rows={8} samples={destinationSamples.samples}
                                    updateSample={updateSampleList}
                                    updateSampleList={placeGroupSamples}
                                    direction={placementType == 'group' ? placementDirection : undefined} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'end', gap: '1vw' }}>
                            <Button onClick={() => { }} style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white' }}>Save</Button>
                            <Button onClick={transferAllSamples}>Transfer All</Button>
                            <Button onClick={() => { }}>Add Destination</Button>
                            <Button onClick={clearSelection}>Clear Selection</Button>
                        </div>
                    </div>
                </PageContent>
            </PageContainer>
        </>)
}
export default LibraryTransfer