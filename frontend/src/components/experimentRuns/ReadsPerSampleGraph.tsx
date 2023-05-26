import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BarChart, XAxis, YAxis, Bar, Tooltip, LineChart, Line } from 'recharts'
import { useAppDispatch } from '../../hooks'
import { loadReadsPerSample } from '../../modules/experimentRunLanes/actions'
import { LaneInfo, SampleReads } from '../../modules/experimentRunLanes/models'
import { useResizeObserver } from '../../utils/ref'


interface ReadsPerSampleGraphProps {
	lane: LaneInfo
}

function ReadsPerSampleGraph({lane}: ReadsPerSampleGraphProps) {

	const DEFAULT_GRAPH_WIDTH = 800
	const MIN_BAR_WIDTH = 4

	const dispatch = useAppDispatch()
	const { ref: resizeRef, size: componentSize } = useResizeObserver(800, 0)
	const [graphWidth, setGraphWidth] = useState<number>(DEFAULT_GRAPH_WIDTH)

	useEffect(() => {
		if (!lane.readsPerSample) {
			dispatch(loadReadsPerSample(lane.runName, lane.laneNumber))
		} 
	}, [lane, dispatch])

	useLayoutEffect(() => {
		if (lane.readsPerSample && componentSize.width > 0) {
			const minGraphWidth = lane.readsPerSample?.sampleReads.length * MIN_BAR_WIDTH
			if (minGraphWidth > componentSize.width) {
				setGraphWidth(minGraphWidth)
			} else {
				setGraphWidth(componentSize.width)
			}
		}
	}, [componentSize, lane.readsPerSample])

	const SampleTooltip = ({active, payload, label}) => {
		if (active && payload && payload.length) {
			const sampleData : SampleReads = payload[0].payload
			return (
				<div>
					{ sampleData.sampleID && 
					<div>{`Sample ID: ${sampleData.sampleID}`}</div>
					}
					<div>{`Name: ${sampleData.sampleName}`}</div>
					<div>{`Count: ${Number(sampleData.nbReads).toFixed(0)}`}</div>
				</div>
			)
		}
		return null
	}

	const data = lane.readsPerSample?.sampleReads ?? []
	const graphData = data.map(sampleRead => {
		return {
			...sampleRead,
			nbReads: Number.parseFloat(sampleRead.nbReads as any)	// make sure the value is numeric, not a string or you get a crazy graph.
		}
	})

	return (
		// <LineChart width={800} height={500} data={data}  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
		// 	<XAxis dataKey='sampleName'/>
		// 	<YAxis dataKey='nbReads'/>
		// 	<Tooltip content={<SampleTooltip/>}/>
		// 	<Line type='linear' dataKey='nbReads' stroke='#DC3A18' isAnimationActive={false}/>
		// </LineChart>
		<div style={{display: 'block', padding: '1em', overflowX: 'scroll', overflowY: 'hidden'}} ref={resizeRef}>
			<BarChart width={graphWidth} height={500} data={graphData} margin={{top: 20, right: 20, bottom: 20, left: 20}}>
				<XAxis/>
				<YAxis type='number'/>
				<Tooltip content={<SampleTooltip/>}/>
				<Bar dataKey='nbReads' fill='#8884d8' isAnimationActive={false}/>
			</BarChart>
		</div>
	)
	// 
}

export default ReadsPerSampleGraph