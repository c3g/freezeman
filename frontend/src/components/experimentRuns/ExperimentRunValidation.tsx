import React, { Children, useEffect, useState } from 'react'
import { ExperimentRun } from '../../models/frontend_models'
import { Button, Collapse, List, Space, Typography } from 'antd'
import CollapsePanel from 'antd/lib/collapse/CollapsePanel'
import { Link } from 'react-router-dom'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { FMSId } from '../../models/fms_api_models'
import { Bar, BarChart, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
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
					<div>{`Count: ${Number(sampleData.nbReads).toFixed(0)}`}</div>
				</div>
			)
		}
		return null
	}

	return (
		// <LineChart width={800} height={500} data={data}  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
		// 	<XAxis xAxisId='xreads' dataKey='sampleName'/>
		// 	<YAxis yAxisId='yreads' dataKey='nbReads' domain={['auto', 'dataMax']}/>
		// 	<Tooltip content={<SampleTooltip/>}/>
		// 	<Line type='stepAfter' dataKey='nbReads' stroke='#DC3A18' activeDot={false} xAxisId={'xreads'} yAxisId={'yreads'} />
		// </LineChart>
		<BarChart width={800} height={500} data={data} margin={{top: 20, right: 20, bottom: 20, left: 20}}>
			<XAxis/>
			<YAxis type='number' domain={['dataMin', 'dataMax']}/>
			<Tooltip content={<SampleTooltip/>}/>
			<Bar dataKey='nbReads' fill='#8884d8'/>
		</BarChart>
	)
	// 
}

export default ExperimentRunValidation