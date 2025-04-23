import React, { useCallback, useEffect, useMemo } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { Button, Col, Popconfirm, Radio, RadioChangeEvent, Row } from "antd"
import PageContainer from "../PageContainer"
import PageContent from "../PageContent"
import AddPlacementContainer, { AddPlacementContainerProps, DestinationContainer } from "./AddPlacementContainer"
import ContainerNameScroller from "./ContainerNameScroller"
import PlacementContainer from "./PlacementContainer"
import { selectContainerKindsByID, selectStepsByID } from "../../selectors"
import { fetchAndLoadSourceContainers, fetchSamplesheet } from "../../modules/labworkSteps/actions"
import PlacementSamplesTable from "./PlacementSamplesTable"
import { selectLabworkStepPlacement } from "../../modules/labworkSteps/selectors"
import { loadContainer as loadPlacementContainer, placeAllSource, setPlacementDirection, setPlacementType, undoSelectedSamples } from "../../modules/placement/reducers"
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
        dispatch(setActiveSourceContainer(sourceContainers[newIndex]?.name))
    }, [activeSourceContainer?.name, dispatch, sourceContainers])

    const changeDestinationContainer = useCallback((direction: number) => {
        const currentIndex = destinationContainers.findIndex((x) => x.name === activeDestinationContainer?.name)
        const newIndex = currentIndex + direction
        if (currentIndex < 0 || newIndex < 0 || newIndex >= destinationContainers.length) {
            return
        }
        dispatch(setActiveDestinationContainer(destinationContainers[newIndex].name))
    }, [activeDestinationContainer?.name, destinationContainers, dispatch])

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
                projectName: sample.project,
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

    const removeSelectedCells = useCallback(() => {
        if (activeDestinationContainer) {
            dispatch(undoSelectedSamples(activeDestinationContainer.name))
        }
    }, [activeDestinationContainer, dispatch])

    return (
        <>
            <PageContainer>
                <PageContent>
                    <Row justify="end" style={{ padding: "10px" }}>
                        <Col span={3}>
                            <AddPlacementContainer onConfirm={onConfirmAddDestinationContainer} existingContainers={loadedContainers} />
                        </Col>
                        {usesSamplesheet && <Col span={3} >
                            <Button
                                onClick={handleGetSamplesheet}
                            // disabled={!isPlacementComplete}
                            >
                                Get Samplesheet
                            </Button>
                        </Col>}
                    </Row>
                    <Row justify="start" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
                        <Col span={12}>
                            <div className={"flex-row"}>
                                <div className={"flex-column"}>
                                    {
                                        activeSourceContainer !== undefined && <>
                                            <ContainerNameScroller
                                                names={sourceContainers.map((c) => c.name)}
                                                name={activeSourceContainer.name}
                                                changeContainer={changeSourceContainer} />
                                            <PlacementContainer
                                                container={activeSourceContainer.name}
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
                                                names={destinationContainers.map((c) => c.name)}
                                                name={activeDestinationContainer.name}
                                                changeContainer={changeDestinationContainer} />
                                            <PlacementContainer
                                                container={activeDestinationContainer.name}
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
                        <Col span={5}>
                            <Radio.Group onChange={updatePlacementType} value={placementType}>
                                <Radio.Button value={PlacementType.PATTERN}> Pattern </Radio.Button>
                                <Radio.Button value={PlacementType.GROUP}> Group </Radio.Button>
                            </Radio.Group>
                        </Col>
                        <Col span={5}>
                            <Radio.Group
                                disabled={placementType !== PlacementType.GROUP}
                                value={placementDirection}
                                onChange={updatePlacementDirection}>
                                <Radio.Button value={PlacementDirections.ROW}> row </Radio.Button>
                                <Radio.Button value={PlacementDirections.COLUMN}> column </Radio.Button>
                            </Radio.Group>
                        </Col>
                        <Col span={8}>
                            <Button onClick={transferAllSamples} disabled={!canTransferAllSamples}>Place All Source</Button>
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
                            {activeSourceContainer !== undefined && <PlacementSamplesTable parentContainerName={activeSourceContainer.name} />}
                        </Col>
                        <Col span={10}>
                            {activeDestinationContainer !== undefined && <PlacementSamplesTable parentContainerName={activeDestinationContainer.name} showContainerColumn />}
                        </Col>
                    </Row>
                </PageContent>
            </PageContainer>
        </>
    )
}
export default Placement

