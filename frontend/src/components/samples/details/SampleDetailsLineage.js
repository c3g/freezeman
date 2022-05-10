import React, { useEffect, useState } from "react";
import { connect } from "react-redux";

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
  class Incomplete extends Error { }

  function createSubGraph(sample) {
    return new GraphADT({ sample, process: undefined },
      sample
        ?.process_measurements
        ?.map((id) => {
          // get process measurement

          if (!(id in processMeasurementsByID)) {
            withProcessMeasurement(processMeasurementsByID, id, process => process.id)
            throw new Incomplete()
          }

          return processMeasurementsByID[id]
        })
        .filter((p) => {
          // ignore process measurement if
          // child_sample field is null (or undefined)

          const id = p?.child_sample

          if (id !== undefined && !samplesByID[id]) {
            withSample(samplesByID, id, sample => sample.id)
            throw new Incomplete()
          }

          return id !== undefined && id !== null
        })
        .map((p) => {
          // create new subtree
          const id = p?.child_sample
          const s = id in samplesByID ? samplesByID[id] : undefined
          const g = createSubGraph(s)
          g.data.process = p

          return g
        }))
  }

  // the process used will not be correct
  function prependPredecessors(subTree) {
    return subTree.data.sample?.child_of
      ?.map((id) => {
        if (!(id in samplesByID)) {
          withSample(samplesByID, id, sample => sample.id)
          throw new Incomplete()
        }

        return samplesByID[id]
      })
      ?.map((sample) => {
        const process = sample
          ?.process_measurements
          ?.map((id) => {
            // get process measurement

            if (!(id in processMeasurementsByID)) {
              withProcessMeasurement(processMeasurementsByID, id, process => process.id)
              throw new Incomplete()
            }

            return processMeasurementsByID[id]
          })
          ?.find((p) =>
            // find process measurement that created 'child'

            p?.child_sample === subTree.data.sample?.id
          )
        subTree.data.process = process

        return new GraphADT({ sample, process: undefined }, [subTree])
      })
      ?.map(prependPredecessors)
      ?.flat() ?? [subTree]
  }

  try {
    // create dummy root for all parents
    const root = new GraphADT(null, prependPredecessors(createSubGraph(sample)))
    const graphData =
      root.reduceNeighbors((oldData, oldChildren, newChildren) => {
        // produce nodes and edges objects
        // that react-d3-graph recognizes

        const nodes = newChildren.map((c) => c.nodes).flat()
        const links = newChildren.map((c) => c.links).flat()

        if (oldData === null) {
          // we're at the dummy root
          return { nodes, links }
        }

        const { sample: parent_sample } = oldData

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
        links.push(...oldChildren.map((c) => {
          const { sample: sample_child, process } = c.data

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
  } catch (err) {
    return <></>
  }
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
