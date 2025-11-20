import React, { RefCallback, useCallback, useEffect, useMemo } from "react";

import { Typography, Card, Space, Button, Popover } from 'antd';

const { Text } = Typography;

import api from "../../../utils/api";
import { useAppDispatch } from '../../../hooks'
import { Sample } from "../../../models/frontend_models";
import { FMSProcessMeasurement, FMSSample } from "../../../models/fms_api_models"
import { Property } from "csstype"

import "./SampleDetailsLineage.scss"
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

interface SampleDetailsLineageProps {
    sample: Partial<Sample>
    handleSampleClick?: (id: FMSSample['id']) => void
    handleProcessClick?: (id: FMSProcessMeasurement['id']) => void
}

function SampleDetailsLineage({ sample, handleSampleClick, handleProcessClick }: SampleDetailsLineageProps) {
    const dispatch = useAppDispatch()

    const [cy, setCy] = React.useState<cytoscape.Core | undefined>(undefined)

    useEffect(() => {
        const cy = cytoscape()
        window.lineageCy = cy // expose lineageCy to the browser console
        setCy(cy)
        return () => {
            cy.destroy()
            delete window.lineageCy
        }
    }, [])

    const [loading, setLoading] = React.useState<boolean>(false)

    useEffect(() => {
        if (!cy) return;
        const sampleID = sample.id;
        if (sampleID === undefined) return;

        setLoading(true)
        dispatch(api.sample_lineage.get(sampleID)).then(({ data }) => {
            cy.remove("*")
            cy.add({
                nodes: data.nodes.reduce<cytoscape.NodeDefinition[]>((prev, node) => {
                    const QCs = [node.quality_flag, node.quantity_flag]
                    const color = QCs.some((f) => f === false) ? "red" : (QCs.every((f) => f === true) ? "green" : "black")
                    const shape = node.id === sampleID ? "star" : "circle"
                    prev.push({
                        data: {
                            id: node.id.toString(),
                            name: node.name,
                            color,
                            shape
                        }
                    })
                    return prev
                }, []),
                edges: data.edges.reduce<cytoscape.EdgeDefinition[]>((prev, edge) => {
                    if (edge.child_sample) {
                        prev.push({
                            data: {
                                source: edge.source_sample.toString(),
                                target: edge.child_sample.toString(),
                                protocol_name: edge.protocol_name,
                                id: edge.id.toString()
                            }
                        })
                    }
                    return prev
                }, [])
            })
            currentNode = cy.$(`node[id="${sampleID}"]`)
            resetLineageLayout()
            setLoading(false)
        })
    }, [cy, dispatch, sample.id])

    useEffect(() => {
        if (!cy) return;

        cy.on("click", "node", (event) => {
            if (handleSampleClick) {
                const node = event.target.data()
                handleSampleClick(parseInt(node.id))
            }
        })
        cy.on("click", "edge", (event) => {
            if (handleProcessClick) {
                const edge = event.target.data()
                handleProcessClick(parseInt(edge.id))
            }
        })
        return () => {
            cy.removeAllListeners()
        }
    }, [cy, handleProcessClick, handleSampleClick])

    const lineageDivRefCallback = useCallback<RefCallback<HTMLDivElement>>((divNode) => {
        if (!cy) return;
        if (divNode === null) return;

        // cytoscape swaps container if already mounted
        cy.mount(divNode)

        // div unmount is already handled in a useEffect cleanup
    }, [cy])

    return <>
        <Space>
            <Button
                type="primary"
                style={{ width: "fit-content" }}
                onClick={resetLineageLayout}
            >
                Reset
            </Button>
            <Button
                type="primary"
                style={{ width: "fit-content" }}
                onClick={recenter}
            >
                Recenter
            </Button>
            <Popover
                content={<Details />}
                placement={"topLeft"}
            >
                <Button
                    type="primary"
                    style={{ width: "fit-content" }}
                >
                    ?
                </Button>
            </Popover>
        </Space>
        
        <div ref={lineageDivRefCallback} id="sample-details-lineage-div" />
    </>
}

function Details() {
    return <div>
        <Card>
            <Legend />
        </Card>
        <Card>
            <Space direction={"vertical"} size={"small"}>
                <Text>
                    Click on node to visit the sample.
                </Text>
                <Text>
                    Click on edge to visit the process.
                </Text>
                <Text>
                    Use the mouse to move and zoom the graph.
                </Text>
            </Space>
        </Card>
    </div>
}

function Legend() {
    interface SymbolProps {
        shape: "circle" | "star",
        color: Property.Color
    }
    function Symbol({ shape, color }: SymbolProps) {
        const output = {
            "circle": <>&#9679;</>,
            "star": <>&#9733;</>
        }
        return <Text style={{ fontSize: 20, color }}>
            {output[shape]}
        </Text>
    }

    interface EntryProps {
        symbol: SymbolProps,
        text: string
    }
    const Entry = ({ symbol, text }: EntryProps) => {
        return <Space direction={"horizontal"} size={"small"}>
            <Symbol {...symbol} />
            <Text>{text}</Text>
        </Space>
    }

    const entries: EntryProps[] = useMemo(() => [
        { symbol: { shape: "star", color: "black" }, text: "You are here" },
        { symbol: { shape: "circle", color: "black" }, text: "Awaiting QC" },
        { symbol: { shape: "circle", color: "red" }, text: "Failed QC" },
        { symbol: { shape: "circle", color: "green" }, text: "Passed QC" },
    ], [])

    return <>
        <Space direction={"vertical"}>
            {entries.map((entry, index) => <Entry key={index.toString()} {...entry} />)}
        </Space>
    </>
}

export default SampleDetailsLineage

cytoscape.use(dagre)

let currentNode: cytoscape.NodeSingular | null = null
function recenter() {
    const lineageCy = window.lineageCy as cytoscape.Core | undefined
    if (!lineageCy) return;

    if (currentNode) {
        lineageCy.zoom(0.75)
        lineageCy.center(currentNode)
    }
}

function resetLineageLayout() {
    const lineageCy = window.lineageCy as cytoscape.Core | undefined
    if (!lineageCy) return;

    lineageCy.style([
        {
            selector: 'node',
            style: {
                'content': 'data(name)',
                'background-color': 'data(color)',
                'color': 'data(color)',
                'text-opacity': 1,
                'text-valign': 'top',
                'text-halign': 'left',
                'shape': 'data(shape)',
            }
        },

        {
            selector: 'edge',
            style: {
                'content': 'data(protocol_name)',
                'curve-style': 'bezier',
                'target-arrow-shape': 'triangle',
                'line-color': '#9dbaea',
                'target-arrow-color': '#9dbaea',
                'width': 4,
            }
        }
    ]).update()
    lineageCy.layout({
        name: 'dagre',
        rankDir: 'LR',
        nodeDimensionsIncludeLabels: true,
        avoidOverlap: true,
        nodeSep: 150,
        rankSep: 150,
        zoomingEnabled: true,
        panningEnabled: true,
    }).run()
    recenter()
}
