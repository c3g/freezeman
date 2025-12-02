import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppDispatch } from '../../hooks'
import { FMSId, FMSReadset } from '../../models/fms_api_models'
import { loadReadsPerSample } from '../../modules/experimentRunLanes/actions'
import { LaneInfo, NumberOfReads } from '../../modules/experimentRunLanes/models'
import api from "../../utils/api"
import { notifyError } from '../../modules/notification/actions'
import { BarRectangleItem } from 'recharts/types/cartesian/Bar'


interface ReadsPerSampleGraphProps {
	lane: LaneInfo
}

function ReadsPerSampleGraph({ lane }: ReadsPerSampleGraphProps) {
	const navigate = useNavigate()
	const dispatch = useAppDispatch()

	useEffect(() => {
		if (!lane.readsPerSample) {
			dispatch(loadReadsPerSample(lane.experimentRunId, lane.laneNumber))
		}
	}, [lane, dispatch])

	const data = lane.readsPerSample?.sampleReads ?? []

	function handleBarClick(_: BarRectangleItem, dataIndex: number) {
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

		if (data[dataIndex].derivedSampleID) {
			goToSampleDetails(data[dataIndex].derivedSampleID, data[dataIndex].readsetID)
		}
	}

	// This component displays the sample name and nbReads in a popup when the user
	// hovers their mouse over a bar. The props for this component are passed to it
	// by recharts.
	const SampleTooltip = ({ active, payload, }: any) => {
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


	return (
		<BarChart
			style={{ width: '100%', aspectRatio: 2 }}
			responsive={true}
			barCategoryGap={0}
			barGap={0}
			data={data}
			margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
		>
			<XAxis tick={false} />
			<YAxis type="number" width={100} tickFormatter={(value: any, index: number) => value.toLocaleString('fr')} />
			<Tooltip content={<SampleTooltip />} />
			<Bar dataKey="nbReads" fill="#8884d8" maxBarSize={100} isAnimationActive={false} onClick={handleBarClick} />
		</BarChart>
	)
}

export default ReadsPerSampleGraph
