import React, { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppDispatch } from '../../hooks'
import { FMSId, FMSSample } from '../../models/fms_api_models'
import { loadReadsPerSample } from '../../modules/experimentRunLanes/actions'
import { LaneInfo, NumberOfReads } from '../../modules/experimentRunLanes/models'
import { list } from '../../modules/samples/actions'
import { useResizeObserver } from '../../utils/ref'


interface ReadsPerSampleGraphProps {
	lane: LaneInfo
}

function ReadsPerSampleGraph({lane}: ReadsPerSampleGraphProps) {

	const DEFAULT_GRAPH_WIDTH = 800
	const MIN_BAR_WIDTH = 4		// Make bars wide enough that the user can click them
	const MAX_BAR_WIDTH = 64	// Don't let bars get too fat or the graph looks silly

	const navigate = useNavigate()
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
			const minGraphWidth = lane.readsPerSample.sampleReads.length * MIN_BAR_WIDTH
			const maxGraphWidth = lane.readsPerSample.sampleReads.length * MAX_BAR_WIDTH 

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
		async function goToSampleDetails(derivedSampleID: FMSId) {
			const options = {
				limit: 10,
				'derived_samples__id__in': derivedSampleID,
				'is_pooled': false
			}
			const response = await dispatch(list(options))
			const samples = response.results as FMSSample[]
			if (samples && samples.length === 1) {
				const url = `/samples/${samples[0].id}`
				navigate(url)
			}
		}

		if (data.derivedSampleID) {
			goToSampleDetails(data.derivedSampleID)
		}
	}

	// This component displays the sample name and nbReads in a popup when the user
	// hovers their mouse over a bar.
	const SampleTooltip = ({active, payload, label}) => {
		if (active && payload && payload.length) {
			const sampleData : NumberOfReads = payload[0].payload
			const style : React.CSSProperties = {
				backgroundColor: 'white',
				backgroundBlendMode: 'difference',
				borderRadius: '6px',
				padding: '0.5em',
			}
			return (
				<div style={style}>
					<div>{`Name: ${sampleData.sampleName}`}</div>
					<div>{`Count: ${Number(sampleData.nbReads).toFixed(0)}`}</div>
				</div>
			)
		}
		return null
	}

	const data = lane.readsPerSample?.sampleReads ?? []

	return (
		<div style={{display: 'block', padding: '1em', overflowX: 'scroll', overflowY: 'hidden'}} ref={resizeRef}>
			<BarChart width={graphWidth} height={500} data={data} margin={{top: 20, right: 20, bottom: 20, left: 20}}>
				<XAxis/>
				<YAxis type='number'/>
				<Tooltip content={<SampleTooltip/>}/>
				<Bar dataKey='nbReads' fill='#8884d8' isAnimationActive={false} onClick={handleBarClick}/>
			</BarChart>
		</div>
	)
}

export default ReadsPerSampleGraph