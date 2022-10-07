import React, { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";

import { Typography, Card, Space, Popover, Button, Spin } from 'antd';

const { Text } = Typography;

import { Graph } from "freezeman-d3-graph"

import dagre from "dagre"
import api, { withToken } from "../../../utils/api";
import { useResizeObserver } from "../../../utils/ref"

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
});


const SampleDetailsLineage = ({
  token,
  sample,
  tabPaneKey  /* This key (should be 'lineage') is used to construct a url when the user clicks a node in the graph. */
}) => {
  const history = useNavigate()
  const { ref: resizeRef, size: maxSize } = useResizeObserver(720, 720)

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })

  const [nodesToEdges, setNodesToEdges] = useState({})
  const [reset, setReset] = useState(false)

  const nodeSize = { width: 10, height: 10 }

  // maxSize.height is sometimes outrageously large or extremely small
  const graphSize = { width: maxSize.width - 50, height: maxSize.height - 150 }
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

  const dagreConfig = {
    rankdir: "LR",
    ranksep: 150,
    nodesep: 150,
    marginx: 50,
    marginy: 50
  }

  const { nodes, links } = graphData
  let dx = 0
  let dy = 0
  if (nodes.length > 0 && sample?.id !== undefined) {
    const enclosedWidth = Math.max(...nodes.map((n) => n.x))

    // find position of current node
    const { x: cx, y: cy } = nodes.find((n) => n.id === sample.id.toString())

    // if graph too wide
    if (enclosedWidth > (graphSize.width - nodeSize.width)) {
      dx = graphSize.width / 2 - cx
    }
    dy = (graphSize.height) / 2 - cy
  }
  const adjustedGraphData = {
    nodes: nodes.map((n) => ({
      ...n,
      x: n.x + dx,
      y: n.y + dy
    })),
    links,
  }

  useEffect(() => {
    if (sample?.id !== undefined) {
      withToken(token, api.sample_lineage.get)(sample.id).then(({data}) => {
        const samples = data.nodes.reduce((prev, curr) => ({
          ...prev,
          [curr.id.toString()]: curr
        }), {})

        // use dagre to position nodes
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
  }, [sample])

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
                    onClickNode={(id, _) => history(`/samples/${id}#${tabPaneKey}`)}
                    onClickLink={(source, target) => {
                      const linkId = nodesToEdges[`${source}:${target}`].id
                      history(`/process-measurements/${linkId}`)
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

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
