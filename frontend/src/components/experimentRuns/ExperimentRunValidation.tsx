import React, { Children, useEffect, useState } from 'react'
import { ExperimentRun } from '../../models/frontend_models'
import { Button, Collapse, List, Space, Typography } from 'antd'
import CollapsePanel from 'antd/lib/collapse/CollapsePanel'
import { Link } from 'react-router-dom'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { FMSId } from '../../models/fms_api_models'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { initExperimentRunLanes, loadReadsPerSample } from '../../modules/experimentRunLanes/actions'
import { ExperimentRunLanes, LaneInfo, SampleReads } from '../../modules/experimentRunLanes/models'
import { loadExternalExperimentRuns } from '../../modules/experimentRuns/externalExperimentsActions'
import { selectExperimentRunLanesState } from '../../selectors'

const { Title } = Typography

// https://recharts.org/en-US/
// https://github.com/recharts/recharts

interface ExperimentRunValidationProps {
	experimentRunName: string
}

// interface FakeExperimentRunLane {
// 	lane_number: number
// 	metrics_urls : string[]
// 	validation_status: 'PASSED' | 'FAILED' | 'NEEDED'
// 	readsPerSample: FakeReadsPerSample
// }

// interface FakeReadsPerSample {
// 	reads: {[key: FMSId] : number}
// }

// const FAKE_METRICS_URL = "https://datahub-297-p25.p.genap.ca/MGI_validation/2023/10173MG01B.report.html"

// const fakeLanes : ReadonlyArray<FakeExperimentRunLane>= [
// 	{
// 		lane_number: 1,
// 		metrics_urls: [FAKE_METRICS_URL, FAKE_METRICS_URL],
// 		validation_status: 'PASSED',
// 		readsPerSample: {reads: (() => {
// 			const r = {}
// 			for(let i = 1; i < 100; i++) {
// 				r[i] = Math.floor(Math.random() * 2000000)
// 			}
// 			return r
// 		})()}
// 	},
// 	{
// 		lane_number: 2,
// 		metrics_urls: [FAKE_METRICS_URL],
// 		validation_status: 'FAILED',
// 		readsPerSample: {reads: {}}
// 	},
// 	{
// 		lane_number: 3,
// 		metrics_urls: [FAKE_METRICS_URL],
// 		validation_status: 'NEEDED',
// 		readsPerSample: {reads: {}}
// 	},
// 	{
// 		lane_number: 4,
// 		metrics_urls: [FAKE_METRICS_URL],
// 		validation_status: 'NEEDED',
// 		readsPerSample: {reads: {}}
// 	},
// ]

function ExperimentRunValidation({experimentRunName} : ExperimentRunValidationProps) {

	const dispatch = useAppDispatch()

	const [initialized, setInitialized] = useState<boolean>(false)
	const experimentRunLanesState = useAppSelector(selectExperimentRunLanesState)

	useEffect(() => {
		if (!initialized) {
			dispatch(initExperimentRunLanes(experimentRunName))
			setInitialized(true)
		}
	}, [dispatch, experimentRunName, initialized])


	const runLanes = experimentRunLanesState.runs[experimentRunName]
	if (!runLanes) {
		return null
	}

	return (
		<Collapse >
			{
				// runLanes.lanes.map(lane => <LanePanel key={lane.laneNumber} lane={lane}/>)
				runLanes.lanes.map(lane => LanePanel({lane: lane}))
			}
		</Collapse>
	)
}





function FlexBar(props) {
	// Displays children in a horizontal flexbox, maximizing the space between the children.
	// Two children will appear at the left and right ends of the bar with whitespace in between.
	return (
		<div style={{display: 'flex', justifyContent: 'space-between', padding: '1em'}}>
			{props.children}
		</div>
	)
}

function getValidationStatusExtra(lane: LaneInfo) {
	switch(lane.validationStatus) {
		case 'AVAILABLE': {
			return (
				<Typography.Text>Needs validation</Typography.Text>
				
			)
		}
		case 'PASSED': {
			return (
				<Space>
					<CheckOutlined style={{color: 'green'}}/>
					<Typography.Text>Passed</Typography.Text>
				</Space>
			)
		}
		case 'FAILED': {
			return (
				<Space>
					<CloseOutlined style={{color: 'red'}}/>
					<Typography.Text>Failed</Typography.Text>
				</Space>
			)
		}
	}
}

interface LanePanelProps {
	lane: LaneInfo
}

function LanePanel({lane} : LanePanelProps) {
	return (
		<Collapse.Panel key={`LANE:${lane.laneNumber}`} header={`${lane.laneNumber}`} extra={getValidationStatusExtra(lane)}>
			<FlexBar >
				{/* <List>
					{lane.metrics_urls.map((url, index) => {
						return (
							<List.Item key={`URL-${index}`}>
								<a href={url} rel='external noopener noreferrer' target='_blank'>View Metrics</a>
							</List.Item>
						)
					})}
				</List> */}
				<Space>
					<Button>Passed</Button>
					<Button>Failed</Button>
				</Space>
			</FlexBar>
			
			<div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
				<ReadsPerSampleGraph lane={lane}/>
				<Title level={5}>Reads Per Sample</Title>
			</div>
			
		</Collapse.Panel>
	)
}

interface ReadsPerSampleGraphProps {
	lane: LaneInfo
}

function ReadsPerSampleGraph({lane}: ReadsPerSampleGraphProps) {

	const dispatch = useAppDispatch()

	useEffect(() => {
		if (!lane.readsPerSample) {
			dispatch(loadReadsPerSample(lane.runName, lane.laneNumber))
		} 
	}, [lane, dispatch])


	const data = lane.readsPerSample?.sampleReads ?? []
	

	const SampleTooltip = ({active, payload, label}) => {
		if (active && payload && payload.length) {
			const sampleData : SampleReads = payload[0].payload
			return (
				<div>
					{ sampleData.sampleID && 
					<div>{`Sample ID: ${sampleData.sampleID}`}</div>
					}
					<div>{`Name: ${sampleData.sampleName}`}</div>
					<div>{`Count: ${sampleData.nbReads}`}</div>
				</div>
			)
		}
		return null
	}

	return (
		<LineChart width={800} height={280} data={data}>
			<XAxis dataKey='sample_id'/>
			<YAxis/>
			<Tooltip content={<SampleTooltip/>}/>
			<Line type='stepAfter' dataKey='count' stroke='#DC3A18' activeDot={false}/>
		</LineChart>
	)
}

export default ExperimentRunValidation