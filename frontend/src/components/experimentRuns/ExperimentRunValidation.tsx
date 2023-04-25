import React, { Children } from 'react'
import { ExperimentRun } from '../../models/frontend_models'
import { Button, Collapse, Space, Typography } from 'antd'
import CollapsePanel from 'antd/lib/collapse/CollapsePanel'
import { Link } from 'react-router-dom'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { FMSId } from '../../models/fms_api_models'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

const { Title } = Typography

// https://recharts.org/en-US/
// https://github.com/recharts/recharts

interface ExperimentRunValidationProps {
	experimentRun: ExperimentRun
}

interface FakeExperimentRunLane {
	lane_number: number
	validation_status: 'PASSED' | 'FAILED' | 'NEEDED'
	readsPerSample: FakeReadsPerSample
}

interface FakeReadsPerSample {
	reads: {[key: FMSId] : number}
}

const fakeLanes : ReadonlyArray<FakeExperimentRunLane>= [
	{
		lane_number: 1,
		validation_status: 'PASSED',
		readsPerSample: {reads: (() => {
			const r = {}
			for(let i = 1; i < 100; i++) {
				r[i] = Math.floor(Math.random() * 2000000)
			}
			return r
		})()}
		// readsPerSample: {reads: {
		// 	1: 10,
		// 	2: 46,
		// 	3: 134,
		// 	4: 945,
		// 	5: 19,
		// 	6: 32,
		// 	7: 144,
		// 	8: 312,
		// 	9: 219,
		// 	10: 44
		// }}
	},
	{
		lane_number: 2,
		validation_status: 'FAILED',
		readsPerSample: {reads: {}}
	},
	{
		lane_number: 3,
		validation_status: 'NEEDED',
		readsPerSample: {reads: {}}
	},
	{
		lane_number: 4,
		validation_status: 'NEEDED',
		readsPerSample: {reads: {}}
	},
]

function ExperimentRunValidation({experimentRun} : ExperimentRunValidationProps) {
	return (
		<Collapse >
			{
				fakeLanes.map(lane => {
					return LanePanel({experimentRun, lane})
				})
			}
		</Collapse>
	)
}

interface LanePanelProps {
	experimentRun: ExperimentRun
	lane: FakeExperimentRunLane
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

function getValidationStatusExtra(lane: FakeExperimentRunLane) {
	switch(lane.validation_status) {
		case 'NEEDED': {
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

function LanePanel({experimentRun, lane} : LanePanelProps) {

	

	return (
		<Collapse.Panel key={`${experimentRun.id}-${lane.lane_number}`} header={`${lane.lane_number}`} extra={getValidationStatusExtra(lane)}>
			<FlexBar >
				<Link to={'#'}>ViewMetrics</Link>
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
	lane: FakeExperimentRunLane
}

function ReadsPerSampleGraph({lane}: ReadsPerSampleGraphProps) {

	const data : any[] = []
	for(const sample_id in lane.readsPerSample.reads) {
		data.push({
			sample_id,
			count: lane.readsPerSample.reads[sample_id]
		})
	}

	const SampleTooltip = ({active, payload, label}) => {
		if (active && payload && payload.length) {
			const sampleData = payload[0].payload
			return (
				<div>
					<div>{`Sample ID: ${sampleData.sample_id}`}</div>
					<div>{`Count: ${sampleData.count}`}</div>
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