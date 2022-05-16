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

const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
  processMeasurementsByID: state.processMeasurements.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const SampleDetailsLineage = ({
  sample,
  samplesByID,
  processMeasurementsByID,
  protocolsByID,
}) => {
  const history = useHistory()

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })

  const [width, setWidth] = useState(1280)
  const [height, setHeight] = useState(720)

  class MissingData extends Error { }

  function rejectUndefined(x) {
    if (x) {
      return true
    } else {
      return false
    }
  }

  function fetchProcessMeasurement(id) {
    return withProcessMeasurement(processMeasurementsByID, id, process => process)
  }

  function fetchSample(id) {
    return withSample(samplesByID, id, s => s)
  }

  function fetchEdgesOfSample(sample, graphs) {
    const processMeasurements =
      sample.process_measurements
        .map(fetchProcessMeasurement)
        .filter(rejectUndefined)
        .filter((p) => p.child_sample !== null)

    const processMeasurementsAndChildSamples =
      processMeasurements
        .map((p) => fetchSample(p.child_sample))
        .filter(rejectUndefined)
        .map((s, i) => [processMeasurements[i], s])

    const edges =
      processMeasurementsAndChildSamples
        .reduce((prev, [p, s]) => {
          if (!graphs.has(s.id)) {
            graphs.set(s.id, new GraphADT(s, fetchEdgesOfSample(s, graphs)))
          }

          return [...prev, [p, graphs.get(s.id)]]
        }, [])

    return edges
  }

  function fetchParentRoots(rootOfSubGraph, graphs) {
    const parentSamples =
      rootOfSubGraph.data.child_of
        .map(fetchSample)
        .filter(rejectUndefined)

    const parentGraphs =
      parentSamples
        .reduce((prev, s) => {
          if (!graphs.has(s.id)) {
            const ps =
              s.process_measurements
                .map(fetchProcessMeasurement)
                .filter(rejectUndefined)
                .filter((p) => p.child_sample === rootOfSubGraph.data.id)

            graphs.set(s.id, new GraphADT(s, ps.map((p) => [p, rootOfSubGraph])))
          }

          return [...prev, ...fetchParentRoots(graphs.get(s.id), graphs)]
        }, []).flat()

    return parentGraphs.length > 0 ? parentGraphs : [rootOfSubGraph]
  }

  useEffect(() => {
    try {
      const graphs = new Map();

      const children = fetchEdgesOfSample(sample, graphs)
      const midRoot = new GraphADT(sample, children)
      graphs.set(sample.id, midRoot)
      const roots = fetchParentRoots(midRoot, graphs)

      const g = new dagre.graphlib.Graph({ directed: true })
        .setGraph({ rankdir: "LR", ranksep: 150, nodesep: 150, marginx: 50, marginy: 50 })
        .setDefaultEdgeLabel(function () { return {}; });

      for (const [_, graph] of graphs) {
        const curr_sample = graph.data

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
        graph.edges.forEach(([_, graph]) => {
          g.setEdge(curr_sample.id.toString(), graph.data.id.toString())
        })
      }

      dagre.layout(g)

      setGraphData({
        nodes: g.nodes().map((v) => {
          return {
            ...g.node(v),
            id: v,
          }
        }),
        links: g.edges().map((e) => {
          const [p, _] = graphs.get(parseInt(e.v)).edges.find(([_, s]) => s.data.id.toString() === e.w)
          return {
            id: p.id.toString(),
            source: e.v,
            target: e.w,
            label: p.protocol in protocolsByID ? protocolsByID[p.protocol]?.name : "",
          }
        })
      })
    } catch (err) {
      if (!(err instanceof MissingData)) {
        throw err
      }
    }
  }, [sample, samplesByID, processMeasurementsByID, protocolsByID])

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
              const linkId = graphData.links.find(
                (link) => {
                  return (link.source === source && link.target === target)
                })?.id

              history.push(`/process-measurements/${linkId}`)
            }}
          />
          : <>Loading...</>
      }
    </>
  )
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
