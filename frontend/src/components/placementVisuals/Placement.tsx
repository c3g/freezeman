import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { PlacementDirections, flushContainers, loadContainers as loadPlacementDestinationContainers, multiSelect, placeAllSource, undoSelectedSamples } from '../../modules/placement/reducers'
import { labworkStepPlacementActions } from "../../modules/labworkSteps/reducers"
import { Button, Col, Popconfirm, Radio, RadioChangeEvent, Row, Switch, notification } from "antd"
import PageContainer from "../PageContainer"
import PageContent from "../PageContent"
import AddPlacementContainer, { AddPlacementContainerProps, DestinationContainer } from "./AddPlacementContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import PlacementContainer from "./PlacementContainer"
import { selectContainerKindsByID } from "../../selectors"
import { fetchAndLoadSourceContainers } from "../../modules/labworkSteps/actions"
import PlacementSamplesTable from "./PlacementSamplesTable"
import { batch } from "react-redux"
import { PlacementData } from "../labwork/step/LabworkStep"

interface PlacementProps {
    sampleIDs: number[],
    stepID: FMSId,
    save: (placementData: PlacementData) => void
}

function Placement({ stepID, sampleIDs, save }: PlacementProps) {
    const dispatch = useAppDispatch()

    const containerKinds = useAppSelector(selectContainerKindsByID)
    const parentContainers = useAppSelector((state) => state.placement.parentContainers)

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
    const placementOptions = useAppSelector((state) => state.labworkStepPlacement.placementOptions)

    const changeSourceContainer = useCallback((direction: number) => {
        const currentIndex = sourceContainers.findIndex((x) => x === activeSourceContainer)
        if (currentIndex < 0 || currentIndex + direction < 0 || currentIndex + direction >= sourceContainers.length) {
            return
        }
        dispatch(labworkStepPlacementActions.setActiveSourceContainer(sourceContainers[currentIndex + direction]))
    }, [activeSourceContainer, dispatch, sourceContainers])
    const sourceContainerIndex = useMemo(() => sourceContainers.findIndex((x) => x === activeSourceContainer), [activeSourceContainer, sourceContainers])

    const changeDestinationContainer = useCallback((direction: number) => {
        const currentIndex = destinationContainers.findIndex((x) => x === activeDestinationContainer)
        if (currentIndex < 0 || currentIndex + direction < 0 || currentIndex + direction >= destinationContainers.length) {
            return
        }
        dispatch(labworkStepPlacementActions.setActiveDestinationContainer(destinationContainers[currentIndex + direction]))
    }, [destinationContainers, dispatch, activeDestinationContainer])
    const destinationContainerIndex = useMemo(() => destinationContainers.findIndex((x) => x === activeDestinationContainer), [activeDestinationContainer, destinationContainers])

    const oldStepID = useAppSelector((state) => state.labworkStepPlacement.stepID)
    useEffect(() => {
        if (stepID !== oldStepID) {
            dispatch(flushContainers(destinationContainers))
            dispatch(labworkStepPlacementActions.flushDestinationContainers())
            dispatch(labworkStepPlacementActions.setStepID(stepID))
        }
    }, [destinationContainers, dispatch, oldStepID, stepID])
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
        dispatch(labworkStepPlacementActions.loadDestinationContainers([container.container_name]))
        dispatch(labworkStepPlacementActions.setActiveDestinationContainer(container.container_name))
    }, [containerKinds, dispatch])

    const updatePlacementDirection = useCallback((event: RadioChangeEvent) => {
        dispatch(labworkStepPlacementActions.setPlacementDirection(event.target.value))
    }, [dispatch])
    const updatePlacementType = useCallback((checked: boolean) => {
        dispatch(labworkStepPlacementActions.setPlacementType(checked ? 'pattern' : 'group'))
    }, [dispatch])

    const canTransferAllSamples = useMemo(() => {
        if (!activeSourceContainer || !activeDestinationContainer) return false
        const sourceContainer = parentContainers[activeSourceContainer]
        const destinationContainer = parentContainers[activeDestinationContainer]

        if (!sourceContainer || !destinationContainer) return false
        const [sRow = [''], sCol = ['']] = sourceContainer.spec
        const [dRow = [''], dCol = ['']] = destinationContainer.spec

        return sRow.length <= dRow.length && sCol.length <= dCol.length
    }, [activeDestinationContainer, activeSourceContainer, parentContainers])

    const transferAllSamples = useCallback(() => {
        if (activeSourceContainer && activeDestinationContainer)
            dispatch(placeAllSource({ source: activeSourceContainer, destination: activeDestinationContainer }))
    }, [activeDestinationContainer, activeSourceContainer, dispatch])

    const clearSelection = useCallback(() => {
        batch(() => {
            for (const parentContainer of sourceContainers) {
                dispatch(multiSelect({
                    parentContainer,
                    type: 'all',
                    forcedSelectedValue: false
                }))
            }
            for (const parentContainer of destinationContainers) {
                dispatch(multiSelect({
                    parentContainer,
                    type: 'all',
                    forcedSelectedValue: false
                }))
            }
        })
    }, [destinationContainers, dispatch, sourceContainers])

    const removeSelectedCells = useCallback(() => {
        if (activeDestinationContainer) {
            dispatch(undoSelectedSamples(activeDestinationContainer))
        }
    }, [activeDestinationContainer, dispatch])

    // TODO: complete implementation
    const saveToPrefill = useCallback(() => {
        try {
            const placementData = destinationContainers.reduce((placementData, containerName) => {
                const destinationContainer = parentContainers[containerName]
                if (!destinationContainer) throw new Error(`Could not find destination container '${containerName}'`)
                for (const coordinates in destinationContainer.cells) {
                    const destinationCell = destinationContainer.cells[coordinates]
                    if (!destinationCell) throw new Error(`Could not find cell at  ${coordinates}@${containerName}`)
                    if (!destinationCell.placedFrom) continue // cell does not contain sample placed from any source container
                    const sourceContainer = parentContainers[destinationCell.placedFrom.parentContainer]
                    if (!sourceContainer) throw new Error(`Could not find source container '${destinationCell.placedFrom.parentContainer}'`)
                    const sourceCell = sourceContainer.cells[destinationCell.placedFrom.coordinates]
                    if (!sourceCell) throw new Error(`Could not find cell at  ${destinationCell.placedFrom.coordinates}@${destinationCell.placedFrom.parentContainer}`)
                    if (!sourceCell.sample) throw new Error(`There is not sample in source cell at ${destinationCell.placedFrom.coordinates}@${destinationCell.placedFrom.parentContainer}`)
                    placementData[sourceCell.sample] = placementData[sourceCell.sample] ? placementData[sourceCell.sample] : []
                    placementData[sourceCell.sample].push({
                        coordinates: coordinates,
                        container_name: containerName,
                        container_barcode: destinationContainer.barcode as string,
                        container_kind: destinationContainer.kind as string
                    })
                }
                return placementData
            }, {} as PlacementData)
            save(placementData)
    
        } catch (e) {
            notification.error({
                message: e.message,
                key: 'LabworkStep.Placement.Prefilling-Failed',
                duration: 20
            })
        }
    }, [destinationContainers, parentContainers, save])

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
                        <Col span={12}>
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
                            <Button onClick={transferAllSamples} disabled={!canTransferAllSamples}>Place All Source</Button>
                            <Button onClick={clearSelection}>Deselect All</Button>
                            <Popconfirm
                                title={`Are you sure you want to undo selected samples? If there are no selected samples, it will undo all placements.`}
                                onConfirm={removeSelectedCells}
                                placement={'bottomRight'}
                            >
                                <Button> Undo Placement</Button>
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

