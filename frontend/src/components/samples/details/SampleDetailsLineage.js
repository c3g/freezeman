import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import { Graph } from "react-d3-graph"

import {
  withSample,
  withProcessMeasurement,
} from "../../../utils/withItem";
import GraphADT from "../../../utils/graph";

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

  const [width, setWidth] = useState(400)
  const [height, setHeight] = useState(400)

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
        .filter((p) => p)
        .filter((p) => p.child_sample !== null)

    const processMeasurementsAndChildSamples =
      processMeasurements
        .map((p) => [p, fetchSample(p.child_sample)])
        .filter(([_, s]) => s)

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
        .filter((s) => s)

    const parentGraphs =
      parentSamples
        .reduce((prev, s) => {
          if (!graphs.has(s.id)) {
            const ps =
              s.process_measurements
                .map(fetchProcessMeasurement)
                .filter((p) => p)
                .filter((p) => p.child_sample === rootOfSubGraph.data.id)

            graphs.set(s.id, new GraphADT(s, ps.map((p) => [p, rootOfSubGraph])))
          }

          return [...prev, ...fetchParentRoots(graphs.get(s.id), graphs)]
        }, []).flat()

    return parentGraphs.length > 0 ? parentGraphs : [rootOfSubGraph]
  }

  useEffect(() => {
    const graphs = new Map();

    const children = fetchEdgesOfSample(sample, graphs)
    const midRoot = new GraphADT(sample, children)
    graphs.set(sample.id, midRoot)
    const roots = fetchParentRoots(midRoot, graphs)

    setGraphData(
      Array.from(graphs.values()).reduce(({ nodes, links }, g) => {
        const curr_sample = g.data
        const children = g.edges

        let color = "black"
        if (curr_sample.quality_flag !== null && curr_sample.quantity_flag !== null) {
          color = curr_sample.quality_flag && curr_sample.quantity_flag ? "green" : "red"
        }

        return {
          nodes: [
            ...nodes,
            {
              id: curr_sample.id.toString(),
              label: curr_sample.name,
              symbolType: curr_sample.id === sample.id ? "star" : "circle",
              color,
              x: (width / 2).toFixed(),
              y: (height / 2).toFixed(),
            },
          ],
          links: [
            ...links,
            ...children
              .map(([process, child_graph]) => {
                const child_sample = child_graph.data

                return {
                  id: process.id.toString(),
                  label: process.protocol in protocolsByID ? protocolsByID[process.protocol]?.name : "",
                  source: curr_sample.id.toString(),
                  target: child_sample.id.toString(),
                }
              }),
          ]
        }
      }, { nodes: [], links: [] })
    )
  }, [sample, samplesByID, processMeasurementsByID, protocolsByID])

  const graphConfig = {
    height,
    width,
    staticGraph: false,
    directed: true,
    maxZoom: 12,
    minZoom: 0.05,
    panAndZoom: true,
    d3: {
      gravity: -500,
      linkLength: 120,
      linkStrength: 2,
    },
    node: {
      color: "#d3d3d3",
      fontColor: "black",
      fontSize: 10,
      renderLabel: true,
      labelProperty: node => `${node.label}`,
      x: (width / 2).toFixed(),
      y: (height / 2).toFixed(),
    },
    link: {
      color: "lightgray",
      fontColor: "black",
      fontSize: 10,
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
