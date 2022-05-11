import React from "react";
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

  let root = new GraphADT(sample)

  // Depth-First Search
  const stack = [[undefined, root]]
  while (stack.length > 0) {
    const [_, top] = stack.pop()
    const sample = top.data

    // find children for sample on top of stack
    top.edges = sample
      ?.process_measurements
      ?.map((id) => {
        // get process measurement

        if (!(id in processMeasurementsByID))
          withProcessMeasurement(processMeasurementsByID, id, process => process.id)

        return processMeasurementsByID[id]
      })
      .filter((p) => {
        // ignore process measurement if
        // child_sample field is null (or undefined)

        const id = p?.child_sample

        if (id !== undefined && !samplesByID[id]) {
          withSample(samplesByID, id, sample => sample.id)
        }

        return id !== undefined && id !== null
      })
      .map((p) => {
        // create new subtree

        const id = p?.child_sample
        const s = id in samplesByID ? samplesByID[id] : undefined

        return [p, new GraphADT(s)]
      })
    top.edges = top.edges ? top.edges : []

    stack.push(...top.edges)
  }

  // add parents
  while (root.data[0]?.child_of?.length > 0) {
    const child = root.data[0].id

    const child_of = root.data[0].child_of
    const parent_sample = samplesByID[child_of]
    const parent_process = parent_sample
      ?.process_measurements
      ?.map((id) => {
        // get process measurement

        if (!(id in processMeasurementsByID))
          withProcessMeasurement(processMeasurementsByID, id, process => process.id)

        return processMeasurementsByID[id]
      })
      ?.find((p) =>
        // find process measurement that created 'child'

        p?.child_sample == child
      )

    // fetch parent
    if (!parent_sample)
      withSample(samplesByID, child_of, sample => sample.id)

    // create new supertree
    root = new GraphADT(parent_sample, [[parent_process, root]])
  }

  const graphData = root.reduceNeighbors((parent_sample, children) => {
    // produce nodes and edges objects
    // that React Flow recognizes

    const nodes = children.map(([_0, _1, c]) => c.nodes).flat()
    const links = children.map(([_0, _1, c]) => c.links).flat()

    let color = "black"
    if (parent_sample?.quality_flag !== null && parent_sample?.quantity_flag !== null) {
      color = parent_sample?.quality_flag && parent_sample?.quantity_flag ? "green" : "red"
    }

    nodes.push({
      id: parent_sample?.id?.toString() || "",
      label: parent_sample?.name || "",
      symbolType: parent_sample?.id === sample?.id ? "star" : "circle",
      color
    })
    links.push(...children.map(([process, child_graph, _]) => {
      const sample_child = child_graph.data

      return {
        id: process?.id?.toString() || "",
        label: process?.protocol in protocolsByID ? protocolsByID[process?.protocol]?.name : "",
        source: parent_sample?.id?.toString() || "",
        target: sample_child?.id?.toString() || "",
      }
    }))
    return { nodes, links }
  })

  const graphConfig = {
    height: 400,
    width: 400,
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
      renderLabel: true,
      labelProperty: node => `${node.label}`
    },
    link: {
      color: "lightgray",
      fontColor: "black",
      strokeWidth: 3,
      type: "STRAIGHT",
      renderLabel: true,
      labelProperty: link => `${link.label}`
    },
  }

  return (
    <>
        <Graph
          id="graph-id"
          data={graphData}
          config={graphConfig}
          onClickNode={(id, _) => history.push(`/samples/${id}`)}
          onClickLink={(source, target) => {
            const linkId = graphData.links.find(
              (link) => {
                return (link.source === source && link.target === target)
              })?.id

            history.push(`/process-measurements/${linkId ?? sample?.id}`)
          }}
        />
    </>
  )
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
