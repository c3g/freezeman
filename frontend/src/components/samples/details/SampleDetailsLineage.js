import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import { Typography, Card, Space, Popover, Button } from 'antd';

const { Text } = Typography;

import { Graph } from "react-d3-graph"

import dagre from "dagre"
import api, { withToken } from "../../../utils/api";

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
  const history = useHistory()

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [pairToProcess, setPairToProcess] = useState({})

  const nodeSize = { width: 10, height: 10 }
  const dagreConfig = { rankdir: "LR", ranksep: 150, nodesep: 150, marginx: 50, marginy: 50 }

  const graphSize = { width: 800, height: 600 }
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

        const g = new dagre.graphlib.Graph({ directed: true })
                           .setGraph(dagreConfig)
                           .setDefaultEdgeLabel(function () { return {}; });

        data.nodes.forEach((curr_sample) => {
          let color = "black"
          if (curr_sample.quality_flag !== null && curr_sample.quantity_flag !== null) {
            color = curr_sample.quality_flag && curr_sample.quantity_flag ? "green" : "red"
          }

          g.setNode(curr_sample.id.toString(), {
            id: curr_sample.id.toString(),
            label: curr_sample.name,
            ...nodeSize,
            color,
            symbolType: curr_sample.id === sample.id ? "star" : "circle",
          })
        })

        data.edges.filter((process) => process.child_sample !== null)
                   .forEach((process) => {
                      g.setEdge(process.source_sample, process.child_sample)
                    })

        const localPairToProcess = data.edges.filter((process) => process.child_sample !== null)
                                              .reduce((prev, p) => {
                                                return {
                                                  ...prev,
                                                  [`${p.source_sample}:${p.child_sample}`]: p
                                                }
                                              }, {})
        
        setPairToProcess(localPairToProcess)

        dagre.layout(g)

	const { x: cx, y: cy }  = g.node(sample.id.toString())
	const dx = graphSize.width/2 - cx
	const dy = graphSize.height*3/4 - cy

	const nodes =  g.nodes()
                        .map((v) => {
			  const n = g.node(v)
                          return {
                            ...n,
                            id: v,
			    x: n.x + dx,
			    y: n.y + dy,
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
      })
    }
  }, [sample])

  return (
    <>
      <Card style={{ ...graphSize }} size={"small"}>
        <Popover
	  content={<Details />}
	  placement={"topRight"}
	>
	  <Button type="primary" style={{ width: "fit-content", float: "right" }}>?</Button>
        </Popover>
        {
          graphData.nodes.length > 0
            ? <Graph
              id="graph-id"
              data={graphData}
              config={graphConfig}
              onClickNode={(id, _) => history.push(`/samples/${id}`)}
              onClickLink={(source, target) => {
                const linkId = pairToProcess[`${source}:${target}`].id
                history.push(`/process-measurements/${linkId}`)
              }}
            />
            : <>Loading...</>
        }
      </Card>
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
          Click on node to visit the sample
        </Text>
        <Text>
          Click on edge to visit the process
        </Text>
        <Text>
          Use the mouse to move and zoom the graph
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
      {entries.map((entry) => <Entry {...entry} />)}
    </Space>
  </>
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
