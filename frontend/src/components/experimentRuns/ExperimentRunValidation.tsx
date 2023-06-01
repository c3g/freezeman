import { CheckOutlined, CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Button, Collapse, List, Space, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { initExperimentRunLanes, setRunLaneValidationStatus } from '../../modules/experimentRunLanes/actions'
import { LaneInfo, ValidationStatus } from '../../modules/experimentRunLanes/models'
import { selectExperimentRunLanesState } from '../../selectors'
import ReadsPerSampleGraph from './ReadsPerSampleGraph'

const { Title, Text } = Typography

// https://recharts.org/en-US/
// https://github.com/recharts/recharts

interface ExperimentRunValidationProps {
	experimentRunName: string
}

function ExperimentRunValidation({ experimentRunName }: ExperimentRunValidationProps) {
	const dispatch = useAppDispatch()

	const [initialized, setInitialized] = useState<boolean>(false)
	const experimentRunLanesState = useAppSelector(selectExperimentRunLanesState)

	useEffect(() => {
		if (!initialized) {
			dispatch(initExperimentRunLanes(experimentRunName))
			setInitialized(true)
		}
	}, [dispatch, experimentRunName, initialized])

	const setPassed = useCallback(
		(lane: LaneInfo) => {
			dispatch(setRunLaneValidationStatus(lane, ValidationStatus.PASSED))
		},
		[dispatch]
	)

	const setFailed = useCallback(
		(lane: LaneInfo) => {
			dispatch(setRunLaneValidationStatus(lane, ValidationStatus.FAILED))
		},
		[dispatch]
	)

	const setAvailable = useCallback(
		(lane: LaneInfo) => {
			dispatch(setRunLaneValidationStatus(lane, ValidationStatus.AVAILABLE))
		},
		[dispatch]
	)

	const runLanes = experimentRunLanesState.runs[experimentRunName]
	if (!runLanes) {
		return null
	}

	return <Collapse>{runLanes.lanes.map((lane) => LanePanel({ lane: lane, setPassed, setFailed, setAvailable }))}</Collapse>
}

function FlexBar(props) {
	// Displays children in a horizontal flexbox, maximizing the space between the children.
	// Two children will appear at the left and right ends of the bar with whitespace in between.
	return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1em' }}>{props.children}</div>
}

function getValidationStatusExtra(lane: LaneInfo) {
	switch (lane.validationStatus) {
		case ValidationStatus.AVAILABLE: {
			// return 
			return (
				<Space>
					<Typography.Text strong>Needs validation</Typography.Text>
					<QuestionCircleOutlined/>
				</Space>
			)
		}
		case ValidationStatus.PASSED: {
			return (
				<Space>
					<Typography.Text>Passed</Typography.Text>
					<CheckOutlined style={{ color: 'green' }} />
				</Space>
			)
		}
		case ValidationStatus.FAILED: {
			return (
				<Space>
					<Typography.Text>Failed</Typography.Text>
					<CloseOutlined style={{ color: 'red' }} />
				</Space>
			)
		}
	}
}

interface LanePanelProps {
	lane: LaneInfo
	setPassed: (lane: LaneInfo) => void
	setFailed: (lane: LaneInfo) => void
	setAvailable: (lane: LaneInfo) => void
}

function LanePanel({ lane, setPassed, setFailed, setAvailable }: LanePanelProps) {
	// Create a list of unique metrics url's from the lane's datasets. Normally all of the
	// datasets should have the same url.
	const urlSet: Set<string> = lane.datasets.reduce<Set<string>>((acc, dataset) => {
		if (dataset.metricsURL) {
			acc.add(dataset.metricsURL)
		}
		return acc
	}, new Set<string>())

	let title = 'Reads Per Sample'
	if (lane.readsPerSample) {
		title = `Reads Per Sample (${lane.readsPerSample.sampleReads.length})`
	}

	return (
		<Collapse.Panel
			key={`LANE:${lane.laneNumber}`}
			header={<Title level={5}>{`Lane ${lane.laneNumber}`}</Title>}
			extra={getValidationStatusExtra(lane)}
		>
			<FlexBar>
				{urlSet.size > 0 && (
					// Display the list of metrics url's associated with the lane's datasets.
					<List>
						{[...urlSet].map((url, index) => {
							return (
								<List.Item key={`URL-${index}`}>
									<a href={url} rel="external noopener noreferrer" target="_blank">
										View Metrics
									</a>
								</List.Item>
							)
						})}
					</List>
				)}

				<Title level={5}>{title}</Title>
				<Space>
					<Button
						onClick={() => {
							setAvailable(lane)
						}}
					>
						Reset
					</Button>
					<Button
						onClick={() => {
							setPassed(lane)
						}}
					>
						Passed
					</Button>
					<Button
						onClick={() => {
							setFailed(lane)
						}}
					>
						Failed
					</Button>
				</Space>
			</FlexBar>

			<ReadsPerSampleGraph lane={lane} />
		</Collapse.Panel>
	)
}

export default ExperimentRunValidation
