import React, { useEffect, useMemo, useState } from "react";

import { Typography, Card, Space, Popover, Button, Spin } from 'antd';

const { Text } = Typography;

import { Graph, GraphConfiguration, GraphData, GraphLink, GraphNode } from "freezeman-d3-graph"

import dagre, { GraphLabel, Node } from "dagre"
import api from "../../../utils/api";
import { useAppDispatch } from '../../../hooks'
import { useResizeObserver } from "../../../utils/ref"
import { ProcessMeasurement, Sample } from "../../../models/frontend_models";
import { FMSId } from "../../../models/fms_api_models";

interface SampleDetailsLineageProps {
  sample: Partial<Sample>
  handleSampleClick?: (id: FMSId) => void
  handleProcessClick?: (id: FMSId) => void
}

interface PositionedGraphNode extends GraphNode {
  x: number
  y: number
}

type SampleLineageGraphSample = Pick<Sample, 'id' | 'name' | 'quality_flag' | 'quantity_flag'>
type SampleLineageGraphProcessMeasurement = (Pick<ProcessMeasurement, 'id' | 'source_sample' | 'child_sample'> & { protocol_name: string })

function SampleDetailsLineage({sample, handleSampleClick, handleProcessClick} : SampleDetailsLineageProps) {
  const dispatch = useAppDispatch()

  const { ref: resizeRef, size: maxSize } = useResizeObserver(720, 720)
  
  const nodeSize = { width: 10, height: 10 }
  
  // maxSize.height is sometimes outrageously large or extremely small
  const graphSize = { width: maxSize.width - 50, height: maxSize.height - 150 }
  const graphConfig: GraphConfiguration<any, any> = {
    ...graphSize,
    staticGraphWithDragAndDrop: true,
    maxZoom: 12,
    minZoom: 0.05,
    panAndZoom: true,
    node: {
      color: "#d3d3d3",
      fontColor: "black",
      fontSize: 14,
      renderLabel: true,
      labelProperty: node => `${node.label}`,
      labelPosition: "bottom",
    },
    link: {
      color: "lightgray",
      fontColor: "black",
      fontSize: 14,
      strokeWidth: 5,
      type: "STRAIGHT",
      renderLabel: true,
      labelProperty: link => `${link.label}`
    },
    // extra parameters typescript forces me to initialize
    automaticRearrangeAfterDropNode: false,
    collapsible: false,
    directed: true,
    focusZoom: 0,
    focusAnimationDuration: 1,
    nodeHighlightBehavior: false,
    linkHighlightBehavior: false,
    highlightDegree: 0,
    highlightOpacity: 0,
    initialZoom: null,
    staticGraph: false,
    d3: {}
  }
  
  const dagreConfig: GraphLabel = {
    rankdir: "LR",
    ranksep: 150,
    nodesep: 150,
    marginx: 50,
    marginy: 50
  }
  
  const [graphData, setGraphData] = useState<GraphData<PositionedGraphNode, GraphLink>>({ nodes: [], links: [] })
  const [nodesToEdges, setNodesToEdges] = useState<{ [key: string]: SampleLineageGraphProcessMeasurement }> ({})
  
  useEffect(() => {
    if (sample.id === undefined) {
      return;
    }
    (async () => {
      const result = await dispatch(api.sample_lineage.get(sample.id))

      // the node is a subset of Sample
      // the edges is a subset of process measurement with annotation
      const {data} : { data: {
        nodes: SampleLineageGraphSample[],
        edges: SampleLineageGraphProcessMeasurement[]
      } } = result

      const samples = data.nodes.reduce((prev: { [key: string]: SampleLineageGraphSample }, curr: SampleLineageGraphSample) => ({
        ...prev,
        [curr.id.toString()]: curr
      }), {})
      
      // use dagre to position nodes
      const g = new dagre.graphlib.Graph({ directed: true })
        .setGraph(dagreConfig)
        .setDefaultEdgeLabel(function () { return {}; })
      for (const sample of data.nodes) {
        g.setNode(sample.id.toString(), { id: sample.id.toString(), ...nodeSize })
      }
      for (const process of data.edges) {
        if (process.child_sample) {
          g.setEdge(process.source_sample.toString(), process.child_sample.toString())
        }
      }
      dagre.layout(g)
      
      // create final nodes and links for graphData for react-d3-graph
      
      const nodes = g.nodes()
        .map((v) => {
          // 'id' is set by g.setNode but typedef is dumb :(
          const n: Node & { id: string } = g.node(v) as Node & { id: string }
          const curr_sample = samples[n.id]
          let color = "black"
          if (curr_sample.quality_flag !== null && curr_sample.quantity_flag !== null) {
            color = curr_sample.quality_flag && curr_sample.quantity_flag ? "green" : "red"
          }
          return {
            ...n,
            id: v,
            color,
            label: curr_sample.name,
            symbolType: curr_sample.id === sample.id ? "star" : "circle",
          }
        })
      const links: GraphLink[] = data.edges.filter((p) => p.child_sample !== null).map((p) => {
        return {
          id: p.id.toString(),
          source: p.source_sample.toString(),
          target: p.child_sample?.toString() as string,
          label: p.protocol_name,
        }
      })
      setGraphData({nodes, links})
      
      setNodesToEdges(
        data.edges.filter((process) => process.child_sample)
        .reduce((prev, p) => {
          return {
            ...prev,
            [`${p.source_sample}:${p.child_sample}`]: p
          }
        }, {})
        )
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample?.id])

  const adjustedGraphData: typeof graphData = useMemo(() => {
    const { nodes, links } = graphData
    let dx = 0
    let dy = 0
    if (nodes.length > 0 && sample.id !== undefined) {
      // Find the node that matches the current sample.
      const currentNode = nodes.find((n) => n.id === sample.id?.toString())
      if (currentNode) {
        const enclosedWidth = Math.max(...nodes.map((n) => n.x))
        const { x: cx, y: cy } = currentNode
        
        // if graph too wide
        if (enclosedWidth > (graphSize.width - nodeSize.width)) {
          dx = graphSize.width / 2 - cx
        }
        dy = (graphSize.height) / 2 - cy
      }
    }

    return {
      nodes: nodes.map((n) => ({
        ...n,
        x: n.x + dx,
        y: n.y + dy
      })),
      links,
    }
  }, [graphData, graphSize.height, graphSize.width, nodeSize.width, sample?.id])

    const [reset, setReset] = useState(false)

    // Take advantage of the fact that
    // useEffect runs after rendering page.
    // The graph will be remounted after
    // being unmounted.
  useEffect(() => {
    if (reset) {
      setReset(false)
    }
  }, [reset])

  return (
    <>
      <Space direction={"vertical"} style={{ height: "100%", width: "100%" }}>
        <Space>
          <Button
            type="primary"
            style={{ width: "fit-content" }}
            onClick={() => setReset(true)}
          >
            Reset
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
        <div ref={resizeRef} style={{ height: "100%", width: "100%", position: "absolute" }}>
          <div style={{ ...graphSize, border: "solid 1px gray" }}>
            {
              // graphData must contain at least one node
              // after fetching all nodes and edges
              graphData.nodes.length > 0
                ? reset
                  ? <Spin size={"large"} />
                  : <Graph
                    id="graph-id"
                    data={adjustedGraphData}
                    config={graphConfig}
                    // tabPaneKey is used to generate a hash url for the lineage tab.
                    // Without the hash url, clicking a node navigates the user to the Overview tab
                    // rather than staying in the graph.
                    onClickNode={(id) => {
                      if (id && handleSampleClick) {
                        handleSampleClick(Number(id))
                      }
                    }}
                    onClickLink={(source, target) => {
                      const linkId = nodesToEdges[`${source}:${target}`].id
                      if (linkId && handleProcessClick) {
                        handleProcessClick(linkId)
                      }
                    }}
                  />
                : <Spin size={"large"} />
            }
          </div>
        </div>
      </Space>
    </>
  )
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
  function Symbol({ shape, color }) {
    const output = {
      "circle": <>&#9679;</>,
      "star": <>&#9733;</>
    }
    return <Text style={{ fontSize: 20, color }}>
      {output[shape]}
    </Text>
  }

  const Entry = ({ symbol, text }) => {
    return <Space direction={"horizontal"} size={"small"}>
      <Symbol {...symbol} />
      <Text>{text}</Text>
    </Space>
  }

  const entries = [
    ["star", "black", "You are here"],
    ["circle", "black", "Awaiting QC"],
    ["circle", "red", "Failed QC"],
    ["circle", "green", "Passed QC"],
  ].map(([shape, color, text]) => ({ symbol: { shape, color }, text }))

  return <>
    <Space direction={"vertical"}>
      {entries.map((entry, index) => <Entry key={index} {...entry} />)}
    </Space>
  </>
}

export default SampleDetailsLineage;
