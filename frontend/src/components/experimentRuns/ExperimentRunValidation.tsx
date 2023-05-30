import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Button, Collapse, Space, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { initExperimentRunLanes, setRunLaneValidationStatus } from '../../modules/experimentRunLanes/actions'
import { LaneInfo, ValidationStatus } from '../../modules/experimentRunLanes/models'
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

	const setPassed = useCallback((lane: LaneInfo) => {
		dispatch(setRunLaneValidationStatus(lane, ValidationStatus.PASSED))
	}, [dispatch])

	const setFailed = useCallback((lane: LaneInfo) => {
		dispatch(setRunLaneValidationStatus(lane, ValidationStatus.FAILED))
	}, [dispatch])

	const runLanes = experimentRunLanesState.runs[experimentRunName]
	if (!runLanes) {
		return null
	}

	return (
		<Collapse >
			{
				runLanes.lanes.map(lane => LanePanel({lane: lane, setPassed: setPassed, setFailed: setFailed}))
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
		case ValidationStatus.AVAILABLE: {
			return (
				<Typography.Text>Needs validation</Typography.Text>
				
			)
		}
		case ValidationStatus.PASSED: {
			return (
				<Space>
					<CheckOutlined style={{color: 'green'}}/>
					<Typography.Text>Passed</Typography.Text>
				</Space>
			)
		}
		case ValidationStatus.FAILED: {
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
	setPassed: (lane: LaneInfo) => void
	setFailed: (lane: LaneInfo) => void
}

function LanePanel({lane, setPassed, setFailed} : LanePanelProps) {
	let title = 'Reads Per Sample'
	if (lane.readsPerSample) {
		title = `Reads Per Sample (${lane.readsPerSample.sampleReads.length})`
	}
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
				<Title level={5}>{title}</Title>
				<Space>
					<Button onClick={() => {setPassed(lane)}}>Passed</Button>
					<Button onClick={() => {setFailed(lane)}}>Failed</Button>
				</Space>
			</FlexBar>
			
			<ReadsPerSampleGraph lane={lane}/>			
		</Collapse.Panel>
	)
}

export default ExperimentRunValidation