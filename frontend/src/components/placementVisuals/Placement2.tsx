import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSId } from "../../models/fms_api_models"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { loadSamplesAndContainers } from "../../modules/placement/actions"
import { Button, Col, Input, Modal, Popconfirm, Radio, Row, Select, Switch, Tabs } from "antd"
import { MAX_CONTAINER_BARCODE_LENGTH, MAX_CONTAINER_NAME_LENGTH } from "../../constants"
import PageContainer from "../PageContainer"
import PageContent from "../PageContent"
import AddPlacementContainer from "./AddPlacementContainer2"
import ContainerNameScroller from "./ContainerNameScroller"
import PlacementContainer from "./PlacementContainer"
import PlacementSamplesTable from "./PlacementSamplesTable"

interface PlacementProps {
    sampleIDs: number[],
    stepID: FMSId,
}

function Placement({ stepID, sampleIDs }: PlacementProps) {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(loadSamplesAndContainers(stepID, sampleIDs))
    }, [dispatch, sampleIDs, stepID])


    return (
        <>
            <PageContainer>
                <PageContent>
                    <Row justify="end" style={{ padding: "10px" }}>
                        <Col span={3}>
                            <AddPlacementContainer onConfirm={(container) => addDestination(container)} destinationContainerList={destinationContainerList} />
                        </Col>
                        <Col span={3}>
                            <Button onClick={saveDestination} style={{ backgroundColor: "#1890ff", color: "white" }}> Save to Prefill </Button>
                        </Col>
                    </Row>
                    <Row justify="start" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
                        <Col span={12}>
                            <div className={"flex-row"}>
                                <div className={"flex-column"}>
                                    {sourceSamples ?
                                        <>
                                            <ContainerNameScroller
                                                disabled={disableChangeSource}
                                                containerType={SOURCE_STRING}
                                                name={sourceSamples.container_name}
                                                changeContainer={changeContainer} />
                                            <PlacementContainer
                                                selectedSampleList={selectedSamples}
                                                containerType={SOURCE_STRING}
                                                columns={sourceSamples.columns}
                                                rows={sourceSamples.rows}
                                                samples={sourceSamples.samples}
                                                updateSamples={updateSamples} />
                                        </>
                                        :
                                        <Col span={12}>
                                            <div className={"flex-row"}>
                                                <div className={"flex-column"} />
                                            </div>
                                        </Col>
                                    }
                                </div>
                            </div>
                        </Col>
                        {sourceSamples && destinationSamples ?
                            <Col span={12}>
                                <div className={"flex-row"}>
                                    <div className={"flex-column"}>
                                        <ContainerNameScroller
                                            disabled={disableChangeDestination}
                                            containerType={DESTINATION_STRING}
                                            name={destinationSamples.container_name}
                                            changeContainer={changeContainer} />
                                        <PlacementContainer
                                            selectedSampleList={selectedSamples}
                                            containerType={DESTINATION_STRING}
                                            columns={destinationSamples.columns}
                                            rows={destinationSamples.rows}
                                            samples={destinationSamples.samples}
                                            updateSamples={updateSamples}
                                            direction={placementType ? placementDirection : undefined}
                                            pattern={!placementType} />
                                    </div>
                                </div>
                            </Col>
                            : <Col span={12}>
                                <div className={"flex-row"}>
                                    <div className={"flex-column"} />
                                </div>
                            </Col>
                        }
                    </Row>
                    <Row justify="end" style={{ padding: "10px" }}>
                        <Col span={3}>
                            <Switch checkedChildren="Pattern" unCheckedChildren="Group" checked={placementType} onChange={updateGroupPlacement}></Switch>
                        </Col>
                        <Col span={5}>
                            <Radio.Group
                                disabled={!placementType}
                                value={placementDirection}
                                onChange={evt => updatePlacementDirection(evt.target.value)}>
                                <Radio.Button value={'row'}> row </Radio.Button>
                                <Radio.Button value={'column'}> column </Radio.Button>
                            </Radio.Group>
                        </Col>
                        <Col span={8}>
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
                        </Col>
                    </Row>
                    <Row justify="space-evenly" style={{ padding: "10px" }}>
                        <Col span={10}>
                            <PlacementSamplesTable onSampleSelect={(samples) => onSampleTableSelect(samples, SOURCE_STRING)} samples={filterPlacedSamples(sourceSamples ? sourceSamples.samples : {})} selectedSamples={filterSelectedSamples(SOURCE_STRING)} />
                        </Col>
                        <Col span={10}>
                            <PlacementSamplesTable onSampleSelect={(samples) => onSampleTableSelect(samples, DESTINATION_STRING)} samples={filterPlacedSamples(destinationSamples ? destinationSamples.samples : {})} selectedSamples={filterSelectedSamples(DESTINATION_STRING)} />
                        </Col>
                    </Row>
                </PageContent>
            </PageContainer>
        </>
    )
}
export default Placement

