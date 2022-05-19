import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import { Graph } from "react-d3-graph"

import {
  withSample,
  withProcessMeasurement,
} from "../../../utils/withItem";
import GraphADT from "../../../utils/graph";

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
  samplesByID,
  processMeasurementsByID,
  protocolsByID,
}) => {
  const history = useHistory()

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [pairToProcess, setPairToProcess] = useState({})

  const [width, setWidth] = useState(1280)
  const [height, setHeight] = useState(720)

  useEffect(() => {
    if (sample?.id !== undefined) {
      withToken(token, api.sample_lineage.get)(sample.id).then((graph) => {
        graph = graph.data

        const g = new dagre.graphlib.Graph({ directed: true })
          .setGraph({ rankdir: "LR", ranksep: 150, nodesep: 150, marginx: 50, marginy: 50 })
          .setDefaultEdgeLabel(function () { return {}; });

        graph.nodes.forEach((curr_sample) => {
          let color = "black"
          if (curr_sample.quality_flag !== null && curr_sample.quantity_flag !== null) {
            color = curr_sample.quality_flag && curr_sample.quantity_flag ? "green" : "red"
          }

          g.setNode(curr_sample.id.toString(), {
            id: curr_sample.id.toString(),
            label: curr_sample.name,
            width: 10,
            height: 10,
            color,
            symbolType: curr_sample.id === sample.id ? "star" : "circle",
          })
        })

        graph.edges
          .filter((process) => process.child_sample !== null)
          .forEach((process) => {
            g.setEdge(process.source_sample, process.child_sample)
          })

        const localPairToProcess = graph.edges
          .filter((process) => process.child_sample !== null)
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
          links: g.edges()
            .map((e) => {
              const p = localPairToProcess[`${e.v}:${e.w}`]
              return {
                id: p.id.toString(),
                source: e.v,
                target: e.w,
                label: p.protocol_name,
              }
            })
        })
      })
    }
  }, [sample])

  const graphConfig = {
    height,
    width,
    staticGraphWithDragAndDrop: true,
    maxZoom: 12,
    minZoom: 0.05,
    panAndZoom: true,
    node: {
      color: "#d3d3d3",
      fontColor: "black",
      fontSize: 12,
      renderLabel: true,
      labelProperty: node => `${node.label}`,
      labelPosition: "top",
    },
    link: {
      color: "lightgray",
      fontColor: "black",
      fontSize: 12,
      strokeWidth: 5,
      type: "STRAIGHT",
      renderLabel: true,
      labelProperty: link => `${link.label}`
    },
  }

  return (
    <>
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
    </>
  )
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
