import React, { RefCallback, useCallback, useEffect, useMemo } from "react";

import { Typography, Card, Space } from 'antd';

const { Text } = Typography;

import api from "../../../utils/api";
import { useAppDispatch } from '../../../hooks'
import { Sample } from "../../../models/frontend_models";
import { FMSProcessMeasurement, FMSSample, FMSSampleLineageGraph } from "../../../models/fms_api_models"
import { Property } from "csstype"

import "./SampleDetailsLineage.scss"
import dagreD3 from "dagre-d3"
import * as d3 from "d3"

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

    useEffect(() => {
        const g = new dagreD3.graphlib.Graph().setGraph({});
        data.nodes.forEach((node) => {
            g.setNode(node.id.toString(), { label: node.id.toString() })
        })
        data.edges.forEach((edge) => {
            if (edge.child_sample)
                g.setEdge(edge.source_sample.toString(), edge.child_sample.toString(), { label: edge.protocol_name })
        })

        const svg = d3.select("#lineage-graph-svg")
        const inner = svg.select("g")

        const zoom = d3.zoom().on("zoom", function() {
            inner.attr("transform", d3.event.transform);
        });
        svg.call(zoom);

        const render = new dagreD3.render();
        render(inner, g);

        // Center the graph
        const initialScale = 0.75;
        svg.call(zoom.transform, d3.zoomIdentity.translate((svg.attr("width") - g.graph().width * initialScale) / 2, 20).scale(initialScale));
        svg.attr('height', g.graph().height * initialScale + 40);
    }, [data.edges, data.nodes])

    return <svg id="lineage-graph-svg" width="600" height="400">
        <g></g>
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
