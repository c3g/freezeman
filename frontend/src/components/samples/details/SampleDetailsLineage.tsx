import React, { RefCallback, useCallback, useEffect, useMemo } from "react";

import { Typography, Card, Space } from 'antd';

const { Text } = Typography;

import api from "../../../utils/api";
import { useAppDispatch } from '../../../hooks'
import { Sample } from "../../../models/frontend_models";
import { FMSProcessMeasurement, FMSSample, FMSSampleLineageGraph } from "../../../models/fms_api_models"
import { Property } from "csstype"

import dagre from "dagre"
import * as d3 from "d3";

interface SampleDetailsLineageProps {
    sample: Partial<Sample>
    handleSampleClick?: (id: FMSSample['id']) => void
    handleProcessClick?: (id: FMSProcessMeasurement['id']) => void
}

function SampleDetailsLineage({ sample, handleSampleClick, handleProcessClick }: SampleDetailsLineageProps) {
    const dispatch = useAppDispatch()

    const [data, setData] = React.useState<FMSSampleLineageGraph>({ nodes: [], edges: [] })

    useEffect(() => {
        if (sample.id !== undefined) {
            dispatch(api.sample_lineage.get(sample.id)).then((result) => {
                setData(result.data)
            })
        }
    }, [dispatch, sample.id])

    const d3ContainerRefCallback = useCallback<RefCallback<SVGSVGElement>>((svgNode) => {
        const g = new dagre.graphlib.Graph<FMSSampleLineageGraph['nodes'][0]>()
        g.setGraph({
            marginx: MARGIN_LEFT + MARGIN_RIGHT,
            marginy: MARGIN_TOP + MARGIN_BOTTOM,
            rankdir: 'LR',
        })
        g.setDefaultEdgeLabel(() => ({}))

        for (const node of data.nodes) {
            g.setNode(node.id.toString(), { ...node })
        }

        for (const edge of data.edges) {
            // child_sample is typically missing for QC. In which case, we would just color the sample node accordingly
            if (edge.child_sample) {
                g.setEdge(edge.source_sample.toString(), edge.child_sample.toString(), { ...edge })
            }
        }

        dagre.layout(g)

        if (svgNode) {
            const svg = d3.select(svgNode);
            
            svg.selectAll("*").remove();  // Clear previous contents

            svg.attr("width", WIDTH)
                .attr("height", HEIGHT)
                .attr("viewBox", [0, 0, g.graph().width ?? WIDTH, g.graph().width ?? HEIGHT])
                .attr("style", "max-width: 100%; height: auto;");

            const link = svg.append("g")
                .selectAll("line")
                .data(g.edges())
                .enter()
                .append("line")
                .attr("stroke", "#000")
                .attr("stroke-width", 2)
                .attr("x1", (d) => g.node(d.v).x)
                .attr("y1", (d) => g.node(d.v).y)
                .attr("x2", (d) => g.node(d.w).x)
                .attr("y2", (d) => g.node(d.w).y)
                .attr("source", (d) => d.v)
                .attr("target", (d) => d.w);
            
            link.append("title").text((d) => `Process ID: ${g.edge(d)?.protocol_name}`);

            const node = svg.append("g")
                .selectAll("circle")
                .data(g.nodes())
                .enter()
                .append("circle")
                .attr("stroke", "#000").attr("stroke-width", 5)
                .attr("cx", (d) => g.node(d).x)
                .attr("cy", (d) => g.node(d).y)
                .attr("r", 5);
            node.append("title").text((d) => g.node(d).id);
        }
    }, [data.edges, data.nodes])

    return <svg ref={d3ContainerRefCallback}>
    </svg>
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

const WIDTH = 1000
const HEIGHT = 1000
const MARGIN_TOP = 10
const MARGIN_RIGHT = 10
const MARGIN_BOTTOM = 10
const MARGIN_LEFT = 10