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

  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])

  class MissingData extends Error {}

  async function fetchProcessMeasurement(id) {
    if (id in processMeasurementsByID && processMeasurementsByID[id]) {
      return processMeasurementsByID[id]
    } else {
      withProcessMeasurement(processMeasurementsByID, id, process => process)
      throw new MissingData(`Missing Process Measurement #${id}`)
    }
  }

  async function fetchSample(id) {
    if (id in samplesByID && samplesByID[id]) {
      return samplesByID[id]
    } else {
      withSample(samplesByID, id, s => s)
      throw new MissingData(`Missing Sample #${id}`)
    }
  }

  async function fetchEdgesOfSample(sample, graphs = new Map()) {
    const processMeasurements = (await Promise.all(
      sample
        .process_measurements
        .map(fetchProcessMeasurement)
    )).filter((p) => p.child_sample !== null)

    const processMeasurementsAndChildSamples = (await Promise.all(
      processMeasurements.map(async (p) => {
        return [p, await fetchSample(p.child_sample)]
      })
    ))

    // had to use reduce in order to avoid
    // race condition on the `graphs`
    const edges = await
      processMeasurementsAndChildSamples
        .reduce(async (promise, [p, s]) => {
          const prev = await promise

          if (!graphs.has(s.id)) {
            graphs.set(s.id, new GraphADT(s, await fetchEdgesOfSample(s)))
          }

          return [...prev, [p, graphs.get(s.id)]]
        }, Promise.resolve([]))

    return edges
  }

  async function fetchParentRoots(rootOfSubGraph, graphs = new Map()) {
    const parentSamples = (await Promise.all(
      rootOfSubGraph.data.child_of.map(fetchSample)
    ))

    const parentGraphs = (await
      parentSamples.reduce(async (promise, s) => {
        const prev = await promise

        if (!graphs.has(s.id)) {
          const p = (
            await Promise.all(
              s.process_measurements.map(fetchProcessMeasurement)
            )
          ).find((p) => {
            // find process that created the child

            p.child_sample === rootOfSubGraph.data.id
          })

          graphs.set(s.id, new GraphADT(s, [p, rootOfSubGraph]))
        }

        return [...prev, ...await fetchParentRoots(graphs.get(s.id))]
      }, Promise.resolve([]))
    ).flat()

    return parentGraphs
  }

  useEffect(() => {
    const graphs = new Map();

    (async () => {
      // i realized i don't really need to build a graph
      // because the `graphs` already contains all the nodes
      // and each node contains edges

      const children = await fetchEdgesOfSample(sample, graphs)
      const subRoot = new GraphADT(sample, children)
      await fetchParentRoots(subRoot, graphs)

      const [nodes, links] = Array.from(graphs.values()).reduce(([nodes, links], g) => {
        const parent_sample = g.data
        const children = g.edges
        
        let color = "black"
        if (parent_sample.quality_flag !== null && parent_sample.quantity_flag !== null) {
          color = parent_sample.quality_flag && parent_sample.quantity_flag ? "green" : "red"
        }

        return [
          [
            {
              id: parent_sample.id.toString(),
              label: parent_sample.name,
              symbolType: parent_sample.id === sample.id ? "star" : "circle",
              color
            },
            ...nodes
          ],
          [
            ...children.map(([process, child_graph]) => {
              const child_sample = child_graph.data

              return {
                id: process.id.toString(),
                label: process.protocol in protocolsByID ? protocolsByID[process.protocol]?.name : "",
                source: parent_sample.id.toString(),
                target: child_sample.id.toString(),
              }
            }),
            ...links
          ]
        ]
      }, [[], []])

      setNodes(nodes)
      setLinks(links)
      setLoading(false)
    })().catch((err) => console.error(err))

  }, [samplesByID, processMeasurementsByID, protocolsByID])

  const graphData = { nodes, links }

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
      {
        loading
          ? "Loading..."
          : <Graph
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
      }
    </>
  )
}

export default connect(mapStateToProps, undefined)(SampleDetailsLineage);
