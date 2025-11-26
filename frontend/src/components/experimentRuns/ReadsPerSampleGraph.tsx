import React, { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppDispatch } from '../../hooks'
import { FMSId, FMSReadset } from '../../models/fms_api_models'
import { loadReadsPerSample } from '../../modules/experimentRunLanes/actions'
import { LaneInfo, NumberOfReads } from '../../modules/experimentRunLanes/models'
import api from "../../utils/api"
import { useResizeObserver } from '../../utils/ref'
import { notifyError } from '../../modules/notification/actions'


interface ReadsPerSampleGraphProps {
  lane: LaneInfo
}

function ReadsPerSampleGraph({ lane }: ReadsPerSampleGraphProps) {
  const DEFAULT_GRAPH_WIDTH = 800
  const MIN_BAR_WIDTH = 3 // Make bars wide enough that the user can click them
  const MAX_BAR_WIDTH = 100 // Leave some space to have the tooltip not be clipped off for low sample count lanes
  const TOOLTIP_SPACE = 200
  const AXIS_WIDTH = 100

  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { ref: resizeRef, size: componentSize } = useResizeObserver(DEFAULT_GRAPH_WIDTH, 0)
  const [graphWidth, setGraphWidth] = useState<number>(DEFAULT_GRAPH_WIDTH)

  useEffect(() => {
    if (!lane.readsPerSample) {
      dispatch(loadReadsPerSample(lane.experimentRunId, lane.laneNumber))
    }
  }, [lane, dispatch])

  useLayoutEffect(() => {
    if (lane.readsPerSample && componentSize.width > 0) {
      const minGraphWidth = AXIS_WIDTH + lane.readsPerSample.sampleReads.length * MIN_BAR_WIDTH
      const maxGraphWidth = AXIS_WIDTH + lane.readsPerSample.sampleReads.length * MAX_BAR_WIDTH

      let finalGraphWidth = componentSize.width
      if (minGraphWidth > componentSize.width) {
        // Allow the graph to be wider than the available space - it will be scrollable.
        finalGraphWidth = minGraphWidth
      } else {
        // If there are only a few samples, set a smaller graph width so that bars aren't too fat.
        if (maxGraphWidth < componentSize.width) {
          finalGraphWidth = maxGraphWidth
        }
      }
      setGraphWidth(finalGraphWidth)
    }
  }, [componentSize, lane.readsPerSample])

  function handleBarClick(data: NumberOfReads) {
    // TODO confirm that this approach is correct...
    // Given a derived sample ID, fetch the sample it is associated with, and
    // navigate to the sample details page. For this to work, there has to be
    // only a single sample, if we disregard any pools that the derived sample
    // may belong to. If, somehow, there is more than one sample associated with
    // the derived sample then this function just does nothing.
    async function goToSampleDetails(derivedSampleID: FMSId, readsetID: FMSId) {
      try {
        const response = await dispatch(api.readsets.get(readsetID))
        const readset: FMSReadset = response.data
        if (readset && readset.sample_source) {
          const url = `/samples/${readset.sample_source}/`
          navigate(url)
        }
      } catch (err) {
        console.error(err)
        dispatch(
          notifyError({
            id: 'RUN_VALIDATION:CANNOT_RETRIEVE_SAMPLE',
            title: 'Failed to retrieve sample',
						description: 'The sample cannot be displayed due to an error.',
          })
        )
      }
    }
    
    if (data.derivedSampleID) {
      goToSampleDetails(data.derivedSampleID, data.readsetID)
    }
  }

  // This component displays the sample name and nbReads in a popup when the user
  // hovers their mouse over a bar. The props for this component are passed to it
  // by recharts.
  const SampleTooltip = ({ active, payload, } : any) => {
    if (active && payload && payload.length) {
      const sampleData: NumberOfReads = payload[0].payload
      const style: React.CSSProperties = {
        backgroundColor: 'white',
        backgroundBlendMode: 'difference',
        borderRadius: '6px',
        padding: '0.5em',
        borderStyle: 'solid',
        borderColor: 'black',
        borderWidth: '1px',
      }
      return (
        <div style={style}>
          <div>{`Name: ${sampleData.sampleName}`}</div>
          <div>{`Count: ${Number(sampleData.nbReads).toLocaleString('fr')}`}</div>
        </div>
      )
    }
    return null
  }

  const data = lane.readsPerSample?.sampleReads ?? []
  const propsAllowEscapeViewBox = {x: true,	y: true}


  return (
    <div style={{ maxWidth: '100%' }} ref={resizeRef}>
      <BarChart
        width={graphWidth}
        height={500}
        barCategoryGap={0}
        barGap={0}
        data={data}
        margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
      >
        <XAxis tick={false} />
        <YAxis type="number" width={100} tickFormatter={(value: any, index: number) => value.toLocaleString('fr')}/>
        <Tooltip allowEscapeViewBox={(graphWidth < TOOLTIP_SPACE) ?  propsAllowEscapeViewBox : {}} content={<SampleTooltip/>} />
        <Bar dataKey="nbReads" fill="#8884d8" isAnimationActive={false} onClick={handleBarClick} />
      </BarChart>
    </div>
  )
}

export default ReadsPerSampleGraph
