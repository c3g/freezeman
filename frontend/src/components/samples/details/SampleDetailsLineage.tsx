import React, { RefCallback, useCallback, useEffect, useMemo } from "react";

import { Typography, Card, Space } from 'antd';

const { Text } = Typography;

import api from "../../../utils/api";
import { useAppDispatch } from '../../../hooks'
import { Sample } from "../../../models/frontend_models";
import { FMSProcessMeasurement, FMSSample, FMSSampleLineageGraph } from "../../../models/fms_api_models"
import { Property } from "csstype"

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
        return
    }, [])

    return <></>
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
