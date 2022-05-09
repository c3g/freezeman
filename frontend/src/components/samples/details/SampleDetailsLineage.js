import React from "react";
import {connect} from "react-redux";

import { Graph } from "react-d3-graph"

import {
  withSample,
  withProcessMeasurement,
} from "../../../utils/withItem";
import Tree from "../../../utils/graph";

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
  let root = new Tree([sample, []])

  // Depth-First Search
  const stack = [root]
  while (stack.length > 0) {
    const top = stack.pop()
    const [sample, _] = top.data

    // find children for sample on top of stack
    top.neighbors = sample
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

        return new Tree([s, p])
      })
    top.neighbors = top.neighbors ? top.neighbors : []

    stack.push(...top.neighbors)
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

    // update process measurement for 'child'
    root.data[1] = parent_process

    // create new supertree
    root = new Tree([parent_sample, undefined], [root])
  }

  const graphData = root.fold((old_data, new_children, old_chilren) => {
    // produce nodes and edges objects
    // that React Flow recognizes

    const [parent_sample, _] = old_data
    
    const nodes = new_children.map((c) => c.nodes).flat()
    const links = new_children.map((c) => c.links).flat()

    nodes.push({
      id: parent_sample?.id?.toString() || "",
      label: parent_sample?.name || ""
    })
    links.push(...old_chilren.map((c) => {
      const [sample_child, process] = c.data

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
      <React.StrictMode>
      <Graph
        id="graph-id"
        data={graphData}
        config={graphConfig}
        onClickNode={(id, _) => location.href = `/samples/${id}`}
        onClickLink={(source, target) => {
          const linkId = graphData.links.find(
            (link) => {
              return (link.source === source && link.target === target)
            })?.id
          location.href = `/process-measurements/${linkId}`
        }}
      />
      </React.StrictMode>
    </>
  )
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
