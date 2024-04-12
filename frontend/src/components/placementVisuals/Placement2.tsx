import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { PlacementDirections, loadContainers as loadPlacementDestinationContainers, multiSelect, setPlacementDirection, setPlacementType } from '../../modules/placement/reducers'
import { labworkStepPlacementActions } from "../../modules/labworkSteps/reducers"
const { setActiveDestinationContainer, setActiveSourceContainer, loadDestinationContainers, maybeFlushSourceContainers, maybeFlushDestinationContainers } = labworkStepPlacementActions
import { Button, Col, Radio, RadioChangeEvent, Row, Switch } from "antd"
import PageContainer from "../PageContainer"
import PageContent from "../PageContent"
import AddPlacementContainer, { AddPlacementContainerProps, DestinationContainer } from "./AddPlacementContainer2"
import ContainerNameScroller from "./ContainerNameScroller2"
import PlacementContainer from "./PlacementContainer2"
import { selectContainerKindsByID } from "../../selectors"
import { fetchAndLoadSourceContainers } from "../../modules/labworkSteps/actions"
import PlacementSamplesTable from "./PlacementSamplesTable"

interface PlacementProps {
    sampleIDs: number[],
    stepID: FMSId,
}

function Placement({ stepID, sampleIDs }: PlacementProps) {
    const dispatch = useAppDispatch()

    const containerKinds = useAppSelector(selectContainerKindsByID)
    const parentContainers = useAppSelector((state) => state.placement.parentContainers)
    const placementOptions = useAppSelector((state) => state.placement.placementOptions)

    const existingDestinationContainers: AddPlacementContainerProps['existingContainers'] = useMemo(() => {
        return Object.entries(parentContainers).map(([name, container]) => ({
            container_barcode: container?.barcode as string,
            container_name: name,
            container_kind: container?.kind as string,
            samples: []
        }))
    }, [parentContainers])

    const sourceContainers = useAppSelector((state) => state.labworkStepPlacement.sourceContainers)
    const destinationContainers = useAppSelector((state) => state.labworkStepPlacement.destinationContainers)
    const activeSourceContainer = useAppSelector((state) => state.labworkStepPlacement.activeSourceContainer)    
    const activeDestinationContainer = useAppSelector((state) => state.labworkStepPlacement.activeDestinationContainer)

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
        dispatch(maybeFlushSourceContainers(stepID))
        dispatch(maybeFlushDestinationContainers(stepID))
    }, [dispatch, stepID])

    useEffect(() => {
        dispatch(fetchAndLoadSourceContainers(stepID, sampleIDs))
    }, [dispatch, sampleIDs, stepID])

    const onConfirmAddDestinationContainer = useCallback((container: DestinationContainer) => {
        dispatch(loadPlacementDestinationContainers([{
            type: 'destination',
            name: container.container_name,
            barcode: container.container_barcode,
            kind: container.container_kind,
            spec: containerKinds[container.container_kind].coordinate_spec,
            containers: Object.values(container.samples).map((sample) => ({
                coordinates: sample.coordinates,
                sample: sample.id
            }))
        }]))
        dispatch(loadDestinationContainers([container.container_name]))
        dispatch(setActiveDestinationContainer(container.container_name))
    }, [containerKinds, dispatch])

    const updatePlacementDirection = useCallback((event: RadioChangeEvent) => {
        dispatch(setPlacementDirection(event.target.value))
    }, [dispatch])
    const updatePlacementType = useCallback((checked: boolean) => {
            dispatch(setPlacementType(checked ? 'pattern' : 'group'))
    }, [dispatch])

    const aCellIsSelectedInSource = useMemo(() => {
        for (const containerName in parentContainers) {
            const container = parentContainers[containerName]
            if (!container || container.type === 'destination') continue
            for (const coordinates in container.cells) {
                const cell = container.cells[coordinates]
                if (!cell) continue
                if (cell.selected) return true
            }
        }
        return false
    }, [parentContainers])

    const transferAllSamples = useCallback(() => {
        dispatch()
    }, [])

    // TODO: complete implementation
    const saveToPrefill = useCallback(() => { }, [])

    return (
        <>
            <PageContainer>
                <PageContent>
                    <Row justify="end" style={{ padding: "10px" }}>
                        <Col span={3}>
                            <AddPlacementContainer onConfirm={onConfirmAddDestinationContainer} existingContainers={existingDestinationContainers} />
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
                        <Col span={8}>
                            <Button onClick={transferAllSamples} disabled={!aCellIsSelectedInSource}>Place All Source</Button>
                            <Button onClick={clearSelection}>Deselect All</Button>
                            <Popconfirm
                                title={`Are you sure you want to undo selected samples? If there are no selected samples, it will undo all placements.`}
                                onConfirm={removeSelectedCells}
                                placement={'bottomRight'}
                                disabled={disableUndo}
                            >
                                <Button disabled={disableUndo} > Undo Placement</Button>
                            </Popconfirm>
                        </Col>
                    </Row>
                    <Row justify="space-evenly" style={{ padding: "10px" }}>
                        <Col span={10}>
                            {activeSourceContainer && <PlacementSamplesTable sampleIDs={sampleIDs} container={activeSourceContainer} />}
                        </Col>
                        <Col span={10}>
                            {activeDestinationContainer && <PlacementSamplesTable sampleIDs={sampleIDs} container={activeDestinationContainer} />}
                        </Col>
                    </Row>
                </PageContent>
            </PageContainer>
        </>
    )
}
export default Placement

