import React, { useCallback, useEffect, useMemo } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Button, Col, Flex, Popconfirm, Radio, RadioChangeEvent, Row } from "antd"
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
                                // disabled={!isPlacementComplete}
                                >
                                    Get Samplesheet
                                </Button>
                            }
                        </Row>
                        <Row id="placement-row-main">
                            { activeSourceContainer !== undefined && <Col span={12}>
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
                                        <Radio.Group onChange={updatePlacementType} value={placementType}>
                                            {Object.entries(PlacementType).map(([key, value]) => (
                                                <Radio.Button key={key} value={value}>{value}</Radio.Button>   
                                            ))}
                                        </Radio.Group>
                                        <Radio.Group
                                            disabled={placementType !== PlacementType.SEQUENTIAL}
                                            value={placementDirection}
                                            onChange={updatePlacementDirection}>
                                            <Radio.Button value={PlacementDirections.ROW}> row </Radio.Button>
                                            <Radio.Button value={PlacementDirections.COLUMN}> column </Radio.Button>
                                        </Radio.Group>
                                    </Flex>
                                </Row>
                                <Row>
                                    {activeSourceContainer !== undefined && <PlacementSamplesTable parentContainerName={activeSourceContainer.name}/>}
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
                                    {activeDestinationContainer !== undefined && <PlacementSamplesTable parentContainerName={activeDestinationContainer.name}/>}
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

