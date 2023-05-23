import React, { Children, useEffect, useState } from 'react'
import { ExperimentRun } from '../../models/frontend_models'
import { Button, Collapse, List, Space, Typography } from 'antd'
import CollapsePanel from 'antd/lib/collapse/CollapsePanel'
import { Link } from 'react-router-dom'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { FMSId } from '../../models/fms_api_models'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppDispatch } from '../../hooks'
import { initExperimentRunLanes } from '../../modules/experimentRunLanes/actions'
import { ExperimentRunLanes } from '../../modules/experimentRunLanes/models'
import { loadExternalExperimentRuns } from '../../modules/experimentRuns/externalExperimentsActions'

const { Title } = Typography

// https://recharts.org/en-US/
// https://github.com/recharts/recharts

interface ExperimentRunValidationProps {
	experimentRun: ExperimentRun
}

interface FakeExperimentRunLane {
	lane_number: number
	metrics_urls : string[]
	validation_status: 'PASSED' | 'FAILED' | 'NEEDED'
	readsPerSample: FakeReadsPerSample
}

interface FakeReadsPerSample {
	reads: {[key: FMSId] : number}
}

const FAKE_METRICS_URL = "https://datahub-297-p25.p.genap.ca/MGI_validation/2023/10173MG01B.report.html"

const fakeLanes : ReadonlyArray<FakeExperimentRunLane>= [
	{
		lane_number: 1,
		metrics_urls: [FAKE_METRICS_URL, FAKE_METRICS_URL],
		validation_status: 'PASSED',
		readsPerSample: {reads: (() => {
			const r = {}
			for(let i = 1; i < 100; i++) {
				r[i] = Math.floor(Math.random() * 2000000)
			}
			return r
		})()}
	},
	{
		lane_number: 2,
		metrics_urls: [FAKE_METRICS_URL],
		validation_status: 'FAILED',
		readsPerSample: {reads: {}}
	},
	{
		lane_number: 3,
		metrics_urls: [FAKE_METRICS_URL],
		validation_status: 'NEEDED',
		readsPerSample: {reads: {}}
	},
	{
		lane_number: 4,
		metrics_urls: [FAKE_METRICS_URL],
		validation_status: 'NEEDED',
		readsPerSample: {reads: {}}
	},
]

function ExperimentRunValidation({experimentRun} : ExperimentRunValidationProps) {

	const dispatch = useAppDispatch()
	const [initialized, setInitialized] = useState<boolean>(false)

	useEffect(() => {
		if (!initialized) {
			dispatch(initExperimentRunLanes('10128MG01A'))
			setInitialized(true)
		}
	}, [dispatch, experimentRun, initialized])

	useEffect(() => {
		if (!initialized) {
			dispatch(loadExternalExperimentRuns())
		}
	}, [dispatch, initialized])

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
				<List>
					{lane.metrics_urls.map((url, index) => {
						return (
							<List.Item key={`URL-${index}`}>
								<a href={url} rel='external noopener noreferrer' target='_blank'>View Metrics</a>
							</List.Item>
						)
					})}
				</List>
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