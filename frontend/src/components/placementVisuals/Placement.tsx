import React, { useCallback, useEffect, useMemo } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Button, Col, Dropdown, Flex, Popconfirm, Radio, RadioChangeEvent, Row, Space } from "antd"
import PageContainer from "../PageContainer"
import PageContent from "../PageContent"
import AddPlacementContainer, { AddPlacementContainerProps, DestinationContainer } from "./AddPlacementContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import PlacementContainer from "./PlacementContainer"
import { selectContainerKindsByID, selectStepsByID } from "../../selectors"
import { fetchAndLoadSourceContainers, fetchSamplesheet } from "../../modules/labworkSteps/actions"
import PlacementSamplesTable from "./PlacementSamplesTable"
import { selectLabworkStepPlacement } from "../../modules/labworkSteps/selectors"
import { loadContainer as loadPlacementContainer, multiSelect, placeAllSource, setPlacementDirection, setPlacementType, undoPlacements } from "../../modules/placement/reducers"
import { loadDestinationContainer, setActiveDestinationContainer, setActiveSourceContainer } from "../../modules/labworkSteps/reducers"
import { PlacementDirections, PlacementType } from "../../modules/placement/models"
import { MenuProps } from "antd/lib"

const EXPERIMENT_RUN_ILLUMINA_STEP = "Experiment Run Illumina"

interface PlacementProps {
    sampleIDs: number[],
    stepID: FMSId,
}

function Placement({ stepID, sampleIDs }: PlacementProps) {
    const dispatch = useAppDispatch()

    const containerKinds = useAppSelector(selectContainerKindsByID)

    const {
        sourceContainers,
        destinationContainers,
        activeSourceContainer,
        activeDestinationContainer
    } = useAppSelector(selectLabworkStepPlacement)
    const step = useAppSelector((state) => selectStepsByID(state)[stepID])
    const usesSamplesheet = step.name === EXPERIMENT_RUN_ILLUMINA_STEP

    const handleGetSamplesheet = useCallback(async () => {
        if (!activeDestinationContainer) return
        await dispatch(fetchSamplesheet(activeDestinationContainer))
    }, [dispatch, activeDestinationContainer])

    const loadedContainers: AddPlacementContainerProps['existingContainers'] = useMemo(() => {
        return [
            ...sourceContainers.reduce((list, c) => {
                if (c.name) {
                    list.push({
                        container_barcode: c.barcode,
                        container_name: c.name,
                        container_kind: c.kind,
                        samples: {}
                    })
                }
                return list
            }, [] as DestinationContainer[]),
            ...destinationContainers.map((c) => ({
                container_barcode: c.barcode,
                container_name: c.name,
                container_kind: c.kind,
                samples: {}
            }))
        ]
    }, [destinationContainers, sourceContainers])

    const placementType = useAppSelector((state) => state.placement.placementType)
    const placementDirection = useAppSelector((state) => state.placement.placementDirection)

    const changeSourceContainer = useCallback((direction: number) => {
        const currentIndex = sourceContainers.findIndex((x) => x.name === activeSourceContainer?.name)
        const newIndex = currentIndex + direction
        if (currentIndex < 0 || newIndex < 0 || newIndex >= sourceContainers.length) {
            return
        }
        dispatch(multiSelect({
            type: "all",
            parentContainer: sourceContainers[currentIndex],
            forcedSelectedValue: false,
            context: {
                source: sourceContainers[currentIndex]
            }
        }))
        dispatch(setActiveSourceContainer(sourceContainers[newIndex]?.name))
    }, [activeSourceContainer?.name, dispatch, sourceContainers])

    const changeDestinationContainer = useCallback((direction: number) => {
        const currentIndex = destinationContainers.findIndex((x) => x.name === activeDestinationContainer?.name)
        const newIndex = currentIndex + direction
        if (currentIndex < 0 || newIndex < 0 || newIndex >= destinationContainers.length) {
            return
        }
        if (activeSourceContainer) {
            dispatch(multiSelect({
                type: "all",
                parentContainer: destinationContainers[currentIndex],
                forcedSelectedValue: false,
                context: {
                    source: activeSourceContainer,
                }
            }))
        }
        dispatch(setActiveDestinationContainer(destinationContainers[newIndex].name))
    }, [activeDestinationContainer?.name, activeSourceContainer, destinationContainers, dispatch])

    useEffect(() => {
        dispatch(fetchAndLoadSourceContainers(stepID, sampleIDs)).then((containerNames) => {
            if (containerNames.length > 0) {
                containerNames.sort()
                dispatch(setActiveSourceContainer(containerNames[0]))
            }
        })
    }, [dispatch, sampleIDs, stepID])

    const onConfirmAddDestinationContainer = useCallback((container: DestinationContainer) => {
        dispatch(loadPlacementContainer({
            parentContainerName: container.container_name,
            spec: containerKinds[container.container_kind].coordinate_spec,
            cells: Object.values(container.samples).map((sample) => ({
                coordinates: sample.coordinates,
                sample: sample.id,
                name: sample.name,
                containerName: 'THIS IS NOT SHOWN IN THE UI',
            }))
        }))
        const nextContainer = {
            name: container.container_name,
            barcode: container.container_barcode,
            kind: container.container_kind,
            spec: containerKinds[container.container_kind].coordinate_spec,
        }
        dispatch(loadDestinationContainer(nextContainer))
        dispatch(setActiveDestinationContainer(nextContainer.name))
    }, [containerKinds, dispatch])

    const updatePlacementDirection = useCallback((event: RadioChangeEvent) => {
        dispatch(setPlacementDirection(event.target.value))
    }, [dispatch])
    const updatePlacementType = useCallback((e: RadioChangeEvent) => {
        dispatch(setPlacementType(e.target.value))
    }, [dispatch])

    useEffect(() => {
        if (activeSourceContainer && activeSourceContainer.name === null) {
            dispatch(setPlacementType(PlacementType.SEQUENTIAL))
        }
    }, [activeSourceContainer, activeSourceContainer?.name, dispatch])

    const canTransferAllSamples = useMemo(() => {
        if (!activeSourceContainer || !activeDestinationContainer) return false
        const sourceContainer = activeSourceContainer
        const destinationContainer = activeDestinationContainer

        if (!sourceContainer || !destinationContainer) return false
        const [sRow = [] as const, sCol = [] as const] = sourceContainer.spec
        const [dRow = [] as const, dCol = [] as const] = destinationContainer.spec

        return sRow.length <= dRow.length && sCol.length <= dCol.length
    }, [activeDestinationContainer, activeSourceContainer])

    const transferAllSamples = useCallback(() => {
        if (activeSourceContainer && activeDestinationContainer)
            dispatch(placeAllSource({ source: activeSourceContainer, destination: activeDestinationContainer }))
    }, [activeDestinationContainer, activeSourceContainer, dispatch])

    const undoPlacementsCallback = useCallback(() => {
        if (activeDestinationContainer) {
            dispatch(undoPlacements(activeDestinationContainer))
        }
    }, [activeDestinationContainer, dispatch])

    const invertSelections = useCallback(() => {
        if (activeSourceContainer) {
            dispatch(multiSelect({
                type: 'all',
                parentContainer: activeSourceContainer,
                invert: true,
                context: { source: activeSourceContainer }
            }))
        }
    }, [activeSourceContainer, dispatch])

    const quadrantSelection = useCallback((quadrant: 1 | 2 | 3 | 4) => {
        if (activeSourceContainer?.name) {
            dispatch(multiSelect({
                type: 'quadrant',
                parentContainer: activeSourceContainer,
                quadrant,
                context: { source: activeSourceContainer }
            }))
        }
    }, [activeSourceContainer, dispatch])
    const quadrantSelectionMenu = useMemo<MenuProps>(() => ({
        items: [
            {
                key: 'quadrant-1',
                label: 'Quadrant 1',
                onClick: () => quadrantSelection(1)
            },
            {
                key: 'quadrant-2',
                label: 'Quadrant 2',
                onClick: () => quadrantSelection(2)
            },
            {
                key: 'quadrant-3',
                label: 'Quadrant 3',
                onClick: () => quadrantSelection(3)
            },
            {
                key: 'quadrant-4',
                label: 'Quadrant 4',
                onClick: () => quadrantSelection(4)
            }
        ]
    }), [quadrantSelection])

    const clearSelections = useCallback(() => {
        if (activeSourceContainer) {
            dispatch(multiSelect({
                type: 'all',
                parentContainer: activeSourceContainer,
                context: { source: activeSourceContainer },
                forcedSelectedValue: false,
            }))
        }
    }, [activeSourceContainer, dispatch])


    return (
        <>
            <PageContainer>
                <PageContent>
                    <div id="placement-div">
                        <Row justify="end">
                            <AddPlacementContainer onConfirm={onConfirmAddDestinationContainer} existingContainers={loadedContainers} />
                            {usesSamplesheet &&
                                <Button
                                    onClick={handleGetSamplesheet}
                                >
                                    Get Samplesheet
                                </Button>
                            }
                        </Row>
                        <Row id="placement-row-main">
                            {activeSourceContainer !== undefined && <Col span={12}>
                                <Row>
                                    <ContainerNameScroller
                                        names={sourceContainers.map((c) => c.name)}
                                        name={activeSourceContainer.name}
                                        changeContainer={changeSourceContainer} />
                                </Row>
                                <Row>
                                    <PlacementContainer
                                        container={activeSourceContainer.name}
                                    />
                                </Row>
                                <Row>
                                    <Flex justify={"space-between"} style={{ width: "100%" }}>
                                        <Space size={"small"} style={{ border: 'solid', borderColor: 'lightgray', borderWidth: '1px', padding: '0.5em' }}>
                                            <span>Selection:</span>
                                            <span>
                                                <Button onClick={clearSelections}>Clear</Button>
                                                <Button onClick={invertSelections} disabled={activeSourceContainer.name === null}>Invert</Button>
                                                <Dropdown menu={quadrantSelectionMenu}>
                                                    <Button>Quandrant</Button>
                                                </Dropdown>
                                            </span>
                                        </Space>
                                        <Space size={"small"} style={{ border: 'solid', borderColor: 'lightgray', borderWidth: '1px', padding: '0.5em' }}>
                                            <span>Placement:</span>
                                            <Radio.Group onChange={updatePlacementType} value={placementType}>
                                                <Radio.Button key={PlacementType.SEQUENTIAL} value={PlacementType.SEQUENTIAL}>{PlacementType.SEQUENTIAL}</Radio.Button>
                                                <Radio.Button key={PlacementType.SOURCE_PATTERN} value={PlacementType.SOURCE_PATTERN} disabled={activeSourceContainer.name === null}>{PlacementType.SOURCE_PATTERN}</Radio.Button>
                                                <Radio.Button key={PlacementType.QUADRANT_PATTERN} value={PlacementType.QUADRANT_PATTERN} disabled={activeSourceContainer.name === null}>{PlacementType.QUADRANT_PATTERN}</Radio.Button>
                                            </Radio.Group>
                                        </Space>
                                        <Space size={"small"} style={{ border: 'solid', borderColor: 'lightgray', borderWidth: '1px', padding: '0.5em' }}>
                                            <span>Direction:</span>
                                            <Radio.Group
                                                disabled={placementType !== PlacementType.SEQUENTIAL}
                                                value={placementDirection}
                                                onChange={updatePlacementDirection}>
                                                <Radio.Button value={PlacementDirections.ROW}>Row</Radio.Button>
                                                <Radio.Button value={PlacementDirections.COLUMN}>Column</Radio.Button>
                                            </Radio.Group>
                                        </Space>
                                    </Flex>
                                </Row>
                                <Row>
                                    {activeSourceContainer !== undefined && <PlacementSamplesTable parentContainerName={activeSourceContainer.name} />}
                                </Row>
                            </Col>}
                            {activeDestinationContainer && <Col span={12}>
                                <Row>
                                    <ContainerNameScroller
                                        names={destinationContainers.map((c) => c.name)}
                                        name={activeDestinationContainer.name}
                                        changeContainer={changeDestinationContainer} />
                                </Row>
                                <Row>
                                    <PlacementContainer
                                        container={activeDestinationContainer.name}
                                    />
                                </Row>
                                <Row justify={"center"}>
                                    <Button onClick={transferAllSamples} disabled={!canTransferAllSamples} style={{ marginRight: '1em' }}>Place All Source</Button>
                                    <Popconfirm
                                        title={`Are you sure you want to undo selected samples? If there are no selected samples, it will undo all placements.`}
                                        onConfirm={undoPlacementsCallback}
                                        placement={'bottomRight'}
                                    >
                                        <Button> Undo Placement</Button>
                                    </Popconfirm>
                                </Row>
                                <Row>
                                    {activeDestinationContainer !== undefined && <PlacementSamplesTable parentContainerName={activeDestinationContainer.name} />}
                                </Row>
                            </Col>}
                        </Row>
                    </div>
                </PageContent>
            </PageContainer>
        </>
    )
}
export default Placement

