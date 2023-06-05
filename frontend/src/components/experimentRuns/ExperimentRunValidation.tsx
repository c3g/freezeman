import { CheckOutlined, CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Button, Collapse, List, Space, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { flushExperimentRunLanes, initExperimentRunLanes, setExpandedLanes, setRunLaneValidationStatus } from '../../modules/experimentRunLanes/actions'
import { ExperimentRunLanes, LaneInfo, ValidationStatus } from '../../modules/experimentRunLanes/models'
import { selectExperimentRunLanesState } from '../../selectors'
import ReadsPerSampleGraph from './ReadsPerSampleGraph'
import { experimentRunLanes } from '../../modules/experimentRunLanes/reducers'

const { Title, Text } = Typography

// https://recharts.org/en-US/
// https://github.com/recharts/recharts

interface ExperimentRunValidationProps {
	experimentRunName: string
}

function createLaneKey(lane: LaneInfo) {
	return `LANE: ${lane.laneNumber}`
}

function ExperimentRunValidation({ experimentRunName }: ExperimentRunValidationProps) {
	const dispatch = useAppDispatch()

	const [initialized, setInitialized] = useState<boolean>(false)
	const experimentRunLanesState = useAppSelector(selectExperimentRunLanesState)
	const [runLanes, setRunLanes] = useState<ExperimentRunLanes>()

	useEffect(() => {
		if (!initialized) {
			dispatch(initExperimentRunLanes(experimentRunName))
			setInitialized(true)
		}
	}, [dispatch, experimentRunName, initialized])

	useEffect(() => {
		// Flush redux state when the component is unmounted
		return () => {dispatch(flushExperimentRunLanes(experimentRunName))}
	}, [dispatch, experimentRunName])

	useEffect(() => {
		const experimentRunLanes = experimentRunLanesState.runs[experimentRunName]
		if (experimentRunLanes) {
			setRunLanes(experimentRunLanes)
		}

	}, [experimentRunName, experimentRunLanesState])


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

	const setLaneExpansionState = useCallback((laneKeys: string | string[]) => {
		if (runLanes) {
			const keys = (typeof laneKeys === 'string') ? [laneKeys] : laneKeys
			const expandedLanes = runLanes.lanes.filter(lane => keys.includes(createLaneKey(lane)))
			dispatch(setExpandedLanes(runLanes.experimentRunName, expandedLanes.map(lane => lane.laneNumber)))
		}
	}, [dispatch, runLanes])

	const expandedLaneKeys: string[] = []
	const lanesUX = experimentRunLanesState.ux[experimentRunName]
	if (lanesUX && runLanes) {
		for (const laneNumber of lanesUX.expandedLanes) {
			const laneInfo = runLanes.lanes.find(lane => lane.laneNumber === laneNumber)
			if (laneInfo) {
				expandedLaneKeys.push(createLaneKey(laneInfo))
			}

		}
	}

	return (
		runLanes && runLanes.lanes.length > 0 ?
			<Collapse onChange={setLaneExpansionState} activeKey={expandedLaneKeys}>{runLanes.lanes.map((lane) => LanePanel({ lane: lane, setPassed, setFailed, setAvailable }))}</Collapse>
		:
			<Text italic style={{paddingLeft: '1em'}}>No datasets for this experiment are available for this experiment yet.</Text>
	)
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
					<QuestionCircleOutlined/>
					<Typography.Text strong>Needs validation</Typography.Text>
				</Space>
			)
		}
		case ValidationStatus.PASSED: {
			return (
				<Space>
					<CheckOutlined style={{ color: 'green' }} />
					<Typography.Text strong>Passed</Typography.Text>
				</Space>
			)
		}
		case ValidationStatus.FAILED: {
			return (
				<Space>
					<CloseOutlined style={{ color: 'red' }} />
					<Typography.Text strong>Failed</Typography.Text>
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
			key={createLaneKey(lane)}
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
