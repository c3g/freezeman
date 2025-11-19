import React, { useCallback, useEffect, useMemo } from "react";

import { Typography, Card, Space, Button, Popover } from 'antd';

const { Text } = Typography;

import api from "../../../utils/api";
import { useAppDispatch } from '../../../hooks'
import { Sample } from "../../../models/frontend_models";
import { FMSProcessMeasurement, FMSSample, FMSSampleLineageGraph } from "../../../models/fms_api_models"
import { Property } from "csstype"

import "./SampleDetailsLineage.scss"
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import cytoscapeDagre from "cytoscape-dagre";

interface SampleDetailsLineageProps {
    sample: Partial<Sample>
    handleSampleClick?: (id: FMSSample['id']) => void
    handleProcessClick?: (id: FMSProcessMeasurement['id']) => void
}


cytoscape.use(dagre)

function SampleDetailsLineage({ sample, handleSampleClick, handleProcessClick }: SampleDetailsLineageProps) {
    const dispatch = useAppDispatch()

    const [data, setData] = React.useState<FMSSampleLineageGraph>({ nodes: [], edges: [] })
    const [cy, setCy] = React.useState<cytoscape.Core | null>(null)

    useEffect(() => {
        if (sample.id !== undefined) {
            dispatch(api.sample_lineage.get(sample.id)).then((result) => {
                setData(result.data)
            })
        }
    }, [dispatch, sample.id])

    const recenter = useCallback(() => {
        if (cy) {
            const currentNode = cy.$(`node[id="${sample.id}"]`)
            cy.center(currentNode)
        }
    }, [cy, sample.id])

    useEffect(() => {
        const layout: cytoscapeDagre.DagreLayoutOptions = {
            name: 'dagre',
            rankDir: 'LR',
            nodeDimensionsIncludeLabels: true,
            avoidOverlap: true,
            nodeSep: 150,
        }

        const container = document.getElementById('sample-details-lineage-div')
        if (container) {
            container.innerHTML = ''
            const cy = window.cy = cytoscape({
                container,
                layout,
                style: [
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
                ],
                elements: {
                    nodes: data.nodes.reduce<cytoscape.NodeDefinition[]>((prev, node) => {
                        const QCs = [node.quality_flag, node.quantity_flag]
                        const color = QCs.some((f) => f === false) ? "red" : (QCs.every((f) => f === true) ? "green" : "black")
                        const shape = node.id === sample.id ? "star" : "circle"
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
                }
            })
            cy.on("click", "node", (event) => {
                const nod = event.target
                if (handleSampleClick) {
                    handleSampleClick(parseInt(nod.data().id))
                }
            })
            cy.on("click", "edge", (event) => {
                const edge = event.target
                if (handleProcessClick) {
                    handleProcessClick(parseInt(edge.data().id))
                }
            })
            const currentNode = cy.$(`node[id="${sample.id}"]`)
            cy.zoom(0.75)
            cy.center(currentNode)
            setCy(cy)
        }
    }, [data.edges, data.nodes, handleProcessClick, handleSampleClick, sample.id])

    return <>
        <Space>
          <Button
            type="primary"
            style={{ width: "fit-content" }}
            onClick={() => recenter()}
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
        <div id="sample-details-lineage-div"></div>
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

export default SampleDetailsLineage;
