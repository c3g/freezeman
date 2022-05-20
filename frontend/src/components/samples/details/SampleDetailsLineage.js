import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

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
  const dagreConfig = { rankdir: "TB", ranksep: 150, nodesep: 150, marginx: 50, marginy: 50 }

  const graphSize = { width: 720, height: 1280 }
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
      withToken(token, api.sample_lineage.get)(sample.id).then((graph) => {
        graph = graph.data

        const g = new dagre.graphlib.Graph({ directed: true })
                           .setGraph(dagreConfig)
                           .setDefaultEdgeLabel(function () { return {}; });

        graph.nodes.forEach((curr_sample) => {
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

        graph.edges.filter((process) => process.child_sample !== null)
                   .forEach((process) => {
                      g.setEdge(process.source_sample, process.child_sample)
                    })

        const localPairToProcess = graph.edges.filter((process) => process.child_sample !== null)
                                              .reduce((prev, p) => {
                                                return {
                                                  ...prev,
                                                  [`${p.source_sample}:${p.child_sample}`]: p
                                                }
                                              }, {})
        
        setPairToProcess(localPairToProcess)

        dagre.layout(g)

        setGraphData({
          nodes: g.nodes()
                  .map((v) => {
                    return {
                      ...g.node(v),
                      id: v
                    }
                  }),
          links: graph.edges.filter((p) => p.child_sample !== null).map((p) => {
                    return {
                      id: p.id.toString(),
                      source: p.source_sample.toString(),
                      target: p.child_sample.toString(),
                      label: p.protocol_name,
                    }
                  })
        })
      })
    }
  }, [sample])

  return (
    <>
    <div style={{
      border: "solid",
      width: "fit-content",
      padding: "1em",
      borderBottom: "none",
      borderWidth: "thin"
    }}>
      <Legend />
    </div>
    <div style={{...graphSize, border: "solid", borderWidth: "thin"}}>
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
    </div>
    </>
  )
}

function Legend() {
  function Symbol({ shape, color }) {
    const output = {
      "circle": <>&#9679;</>,
      "start": <>&#9733;</>
    }
    return <span style={{ fontSize: 20, color }}>
      {output[shape]}
    </span>
  }

  const Entry = ({ symbol, text }) => {
    return <div>
      <Symbol {...symbol} /> {text}
    </div>
  }

  const entries = [
    ["start", "black", "You are here"],
    ["circle", "black", "Awaiting QC"],
    ["circle", "red", "Failed QC"],
    ["circle", "green", "Passed QC"],
  ].map(([shape, color, text]) => ({ symbol: { shape, color }, text }))

  return <>
    {entries.map((entry) => <Entry {...entry} />)}
  </>
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
