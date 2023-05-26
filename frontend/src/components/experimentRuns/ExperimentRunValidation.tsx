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
import ReadsPerSampleGraph from './ReadsPerSampleGraph'

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
			
			<ReadsPerSampleGraph lane={lane}/>
			<Title level={5}>Reads Per Sample</Title>
			{/* <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
				
				
			</div> */}
			
		</Collapse.Panel>
	)
}

interface ReadsPerSampleGraphProps {
	lane: LaneInfo
}


export default ExperimentRunValidation