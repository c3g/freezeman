import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { loadContainers as loadSourceContainers } from "../../modules/placement/actions"
import { PlacementDirections, loadContainers as loadDestinationContainers, setActiveDestinationContainer, setActiveSourceContainer, setPlacementDirection, setPlacementType } from '../../modules/placement/reducers'
import { Button, Col, Radio, RadioChangeEvent, Row, Switch } from "antd"
import PageContainer from "../PageContainer"
import PageContent from "../PageContent"
import AddPlacementContainer, { DestinationContainer } from "./AddPlacementContainer2"
import ContainerNameScroller from "./ContainerNameScroller2"
import PlacementContainer from "./PlacementContainer2"
import { selectContainerKindsByID } from "../../selectors"

interface PlacementProps {
    sampleIDs: number[],
    stepID: FMSId,
}

function Placement({ stepID, sampleIDs }: PlacementProps) {
    const dispatch = useAppDispatch()

    const containerKinds = useAppSelector(selectContainerKindsByID)
    const parentContainers = useAppSelector((state) => state.placement.parentContainers)
    const activeSourceContainer = useAppSelector((state) => state.placement.activeSourceContainer)
    const activeDestinationContainer = useAppSelector((state) => state.placement.activeDestinationContainer)
    const placementOptions = useAppSelector((state) => state.placement.placementOptions)

    const [sourceContainers, setSourceContainers] = useState<string[]>([])
    const [destinationContainers, setDestinationContainers] = useState<string[]>([])

    const changeSourceContainer = useCallback((direction: number) => {
        const currentIndex = sourceContainers.findIndex((x) => x === activeSourceContainer)
        if (currentIndex < 0 || currentIndex + direction < 0 || currentIndex + direction >= sourceContainers.length) {
            return
        }
        dispatch(setActiveSourceContainer(sourceContainers[currentIndex + direction]))
    }, [activeSourceContainer, dispatch, sourceContainers])
    const sourceContainerIndex = useMemo(() => sourceContainers.findIndex((x) => x === activeSourceContainer), [activeSourceContainer, sourceContainers])

    const changeDestinationContainer = useCallback((direction: number) => {
        const currentIndex = destinationContainers.findIndex((x) => x === activeDestinationContainer)
        if (currentIndex < 0 || currentIndex + direction < 0 || currentIndex + direction >= destinationContainers.length) {
            return
        }
        dispatch(setActiveDestinationContainer(destinationContainers[currentIndex + direction]))
    }, [destinationContainers, dispatch, activeDestinationContainer])
    const destinationContainerIndex = useMemo(() => destinationContainers.findIndex((x) => x === activeDestinationContainer), [activeDestinationContainer, destinationContainers])

    useEffect(() => {
        dispatch(loadSourceContainers(stepID, sampleIDs)).then((parentContainers) => {
            parentContainers.sort()
            setSourceContainers(parentContainers)
            dispatch(setActiveSourceContainer(parentContainers[0]))
        })
    }, [dispatch, sampleIDs, stepID])

    const onConfirmAddDestinationContainer = useCallback((container: DestinationContainer) => {
        dispatch(loadDestinationContainers([{
            name: container.container_name,
            barcode: container.container_barcode,
            kind: container.container_kind,
            spec: containerKinds[container.container_kind].coordinate_spec,
            containers: Object.values(container.samples).map((sample) => ({
                coordinates: sample.coordinates,
                sample: sample.id
            }))
        }]))
        setDestinationContainers((destinationContainers) => {
            const result = [...destinationContainers, container.container_name]
            result.sort()
            return result
        })
        dispatch(setActiveDestinationContainer(container.container_name))
    }, [containerKinds, dispatch])

    const updatePlacementDirection = useCallback((event: RadioChangeEvent) => {
        dispatch(setPlacementDirection(event.target.value))
    }, [dispatch])
    const updatePlacementType = useCallback((checked: boolean) => {
            dispatch(setPlacementType(checked ? 'pattern' : 'group'))
    }, [dispatch])

    // TODO: complete implementation
    const saveToPrefill = useCallback(() => { }, [])

    return (
        <>
            <PageContainer>
                <PageContent>
                    <Row justify="end" style={{ padding: "10px" }}>
                        <Col span={3}>
                            <AddPlacementContainer onConfirm={onConfirmAddDestinationContainer} existingContainers={Object.entries(parentContainers).map(([name, container]) => ({
                                container_barcode: container?.barcode as string,
                                container_name: name,
                                container_kind: container?.kind as string,
                                samples: []
                            }))} />
                        </Col>
                        <Col span={3}>
                            <Button onClick={saveToPrefill} style={{ backgroundColor: "#1890ff", color: "white" }}> Save to Prefill </Button>
                        </Col>
                    </Row>
                    <Row justify="start" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
                        <Col span={12}>
                            <div className={"flex-row"}>
                                <div className={"flex-column"}>
                                    {activeSourceContainer &&
                                        <>
                                            <ContainerNameScroller
                                                names={sourceContainers}
                                                index={sourceContainerIndex}
                                                changeContainer={changeSourceContainer} />
                                            <PlacementContainer
                                                container={activeSourceContainer}
                                            />
                                        </>
                                    }
                                    :
                                    <Col span={12}>
                                        <div className={"flex-row"}>
                                            <div className={"flex-column"} />
                                        </div>
                                    </Col>
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className={"flex-row"}>
                                <div className={"flex-column"}>
                                    {activeDestinationContainer &&
                                        <>
                                            <ContainerNameScroller
                                                names={destinationContainers}
                                                index={destinationContainerIndex}
                                                changeContainer={changeDestinationContainer} />
                                            <PlacementContainer
                                                container={activeDestinationContainer}
                                            />
                                        </>
                                    }
                                </div>
                            </div>
                        </Col>
                        : <Col span={12}>
                            <div className={"flex-row"}>
                                <div className={"flex-column"} />
                            </div>
                        </Col>
                    </Row>
                    <Row justify="end" style={{ padding: "10px" }}>
                        <Col span={3}>
                            <Switch checkedChildren="Pattern" unCheckedChildren="Group" checked={placementOptions.type === 'pattern'} onChange={updatePlacementType}></Switch>
                        </Col>
                        <Col span={5}>
                            <Radio.Group
                                disabled={placementOptions.type === 'pattern'}
                                value={placementOptions.type === 'group' && placementOptions.direction}
                                onChange={updatePlacementDirection}>
                                <Radio.Button value={PlacementDirections.row}> row </Radio.Button>
                                <Radio.Button value={PlacementDirections.column}> column </Radio.Button>
                            </Radio.Group>
                        </Col>
                        {/* <Col span={8}>
                            <Button onClick={transferAllSamples} disabled={!destinationSamples}>Place All Source</Button>
                            <Button onClick={clearSelection}>Deselect All</Button>
                            <Popconfirm
                                title={`Are you sure you want to undo selected samples? If there are no selected samples, it will undo all placements.`}
                                onConfirm={removeSelectedCells}
                                placement={'bottomRight'}
                                disabled={disableUndo}
                            >
                                <Button disabled={disableUndo} > Undo Placement</Button>
                            </Popconfirm>
                        </Col> */}
                    </Row>
                    {/* <Row justify="space-evenly" style={{ padding: "10px" }}>
                        <Col span={10}>
                            <PlacementSamplesTable onSampleSelect={(samples) => onSampleTableSelect(samples, SOURCE_STRING)} samples={filterPlacedSamples(sourceSamples ? sourceSamples.samples : {})} selectedSamples={filterSelectedSamples(SOURCE_STRING)} />
                        </Col>
                        <Col span={10}>
                            <PlacementSamplesTable onSampleSelect={(samples) => onSampleTableSelect(samples, DESTINATION_STRING)} samples={filterPlacedSamples(destinationSamples ? destinationSamples.samples : {})} selectedSamples={filterSelectedSamples(DESTINATION_STRING)} />
                        </Col>
                    </Row> */}
                </PageContent>
            </PageContainer>
        </>
    )
}
export default Placement

