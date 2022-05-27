import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import { Typography, Card, Space, Popover, Button } from 'antd';

const { Text } = Typography;

import { Graph } from "react-d3-graph"

import dagre from "dagre"
import api, { withToken } from "../../../utils/api";
import { useResizeObserver } from "../../../utils/ref"

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  samplesByID: state.samples.itemsByID,
  processMeasurementsByID: state.processMeasurements.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const SampleDetailsLineage = ({
  token,
  sample,
}) => {
  const { ref: resizeRef, size: maxSize } = useResizeObserver(720, 720)

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [nodesToEdges, setNodesToEdges] = useState({})

  const nodeSize = { width: 10, height: 10 }

  // maxSize.height is sometimes outrageously large
  const graphSize = { width: maxSize.width, height: maxSize.width }
  const graphConfig = {
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
  }

  useEffect(() => {
    if (sample?.id !== undefined) {
      withToken(token, api.sample_lineage.get)(sample.id).then(({data}) => {
        const samples = data.nodes.reduce((prev, curr) => ({
          ...prev,
          [curr.id.toString()]: curr
        }), {})

        // use dagre to position nodes

        const dagreConfig = {
          rankdir: "LR",
          ranksep: 150,
          nodesep: 150,
          marginx: 50,
          marginy: 50
        }
        const g = new dagre.graphlib.Graph({ directed: true })
                           .setGraph(dagreConfig)
                           .setDefaultEdgeLabel(function () { return {}; });
        data.nodes.forEach((sample) => {
          g.setNode(sample.id.toString(), {
            id: sample.id.toString(),
            ...nodeSize,
          })
        })
        data.edges.filter((process) => process.child_sample !== null)
                  .forEach((process) => {
                     g.setEdge(process.source_sample, process.child_sample)
                  })

        dagre.layout(g)

        const { x: cx, y: cy }  = g.node(sample.id.toString())
        const dx = nodeSize.width*5  - cx
        const dy = graphSize.height/2 - cy

        // create final nodes and links

        const nodes = g.nodes()
                       .map((v) => {
                         const n = g.node(v)
                         const curr_sample = samples[n.id]
                         let color = "black"
                         if (curr_sample.quality_flag !== null && curr_sample.quantity_flag !== null) {
                           color = curr_sample.quality_flag && curr_sample.quantity_flag ? "green" : "red"
                         }
                         return {
                           ...n,
                           id: v,
                           x: n.x + dx,
                           y: n.y + dy,
                           color,
                           label: curr_sample.name,
                           symbolType: curr_sample.id === sample.id ? "star" : "circle",
                         }
                       })

        const links = data.edges.filter((p) => p.child_sample !== null).map((p) => {
            return {
              id: p.id.toString(),
              source: p.source_sample.toString(),
              target: p.child_sample.toString(),
              label: p.protocol_name,
            }
          })

        setGraphData({nodes, links})
        setNodesToEdges(
          data.edges.filter((process) => process.child_sample !== null)
                    .reduce((prev, p) => {
                      return {
                        ...prev,
                        [`${p.source_sample}:${p.child_sample}`]: p
                      }
                    }, {})
        )
      })
    }
  }, [sample?.id])

  return (
    <>
      <div ref={resizeRef} style={{ width: "100%", height: "100%" }}>
        <Space direction={"vertical"}>
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
          <Card style={{ ...graphSize }} size={"small"}>
            {
              graphData.nodes.length > 0
                ? <GraphComponent
                  data={graphData}
                  config={graphConfig}
                  nodesToEdge={nodesToEdges}
                />
                : <>Loading...</>
            }
          </Card>
        </Space>
      </div>
    </>
  )
}

function GraphComponent({ data, config, nodesToEdge }) {
  const history = useHistory()

  return <Graph
    id="graph-id"
    data={data}
    config={config}
    onClickNode={(id, _) => history.push(`/samples/${id}`)}
    onClickLink={(source, target) => {
      const linkId = nodesToEdge[`${source}:${target}`].id
      history.push(`/process-measurements/${linkId}`)
    }}
  />
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

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
