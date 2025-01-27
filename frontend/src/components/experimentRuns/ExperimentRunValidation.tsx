import { Button, Collapse, List, Popconfirm, Space, Typography, Layout } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { flushExperimentRunLanes, initExperimentRunLanes, setExpandedLanes, setRunLaneValidationStatus } from '../../modules/experimentRunLanes/actions'
import { ExperimentRunLanes, LaneInfo, ValidationStatus } from '../../modules/experimentRunLanes/models'
import { selectExperimentRunLanesState, selectDatasetsByID } from '../../selectors'
import { addArchivedComment } from '../../modules/datasets/actions'
import LaneValidationStatus from './LaneValidationStatus'
import ReadsPerSampleGraph from './ReadsPerSampleGraph'
import DatasetArchivedCommentsBox from './DatasetArchivedCommentsBox'
import { Dataset } from '../../models/frontend_models'
import api from '../../utils/api'

const { Sider, Content } = Layout;
const { Title, Text } = Typography


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
	
	// Staff are allowed to change the lane validation status whenever needed.
	const currentUser = useCurrentUser()
	const isStaff = currentUser?.is_staff ?? false
	
	// Setting a run validated is a bit slow, so disable the validation buttons while
	// a validation is in progress so users can't click the button and trigger another call to the backend.
	const [isValidationInProgress, setIsValidationInProgress] = useState<boolean>(false)

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
			setIsValidationInProgress(true)
			dispatch(setRunLaneValidationStatus(lane, ValidationStatus.PASSED))
				.finally(() => {setIsValidationInProgress(false)})
		},
		[dispatch]
	)

	const setFailed = useCallback(
		(lane: LaneInfo) => {
			setIsValidationInProgress(true)
			dispatch(setRunLaneValidationStatus(lane, ValidationStatus.FAILED))
				.finally(() => {setIsValidationInProgress(false)})
		},
		[dispatch]
	)

	const setAvailable = useCallback(
		(lane: LaneInfo) => {
			setIsValidationInProgress(true)
			dispatch(setRunLaneValidationStatus(lane, ValidationStatus.AVAILABLE))
				.finally(() => {setIsValidationInProgress(false)})
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
			<Collapse onChange={setLaneExpansionState} activeKey={expandedLaneKeys}>{
				runLanes.lanes.map(lane => {
					return (
						<Collapse.Panel 
							key={createLaneKey(lane)}
							header={<Title level={5}>{`Lane ${lane.laneNumber}`}</Title>}
							extra={<Space direction={'horizontal'}>
								<LaneValidationStatus validationStatus={lane.validationStatus} isValidationInProgress={isValidationInProgress}/>
								{lane.validationTime ? ['-', `${new Date(lane.validationTime).toLocaleDateString()}`] : ''}
							</Space>}
						>
							<LanePanel 
								lane={lane}
								canReset={isStaff} 
								canValidate={isStaff || lane.validationStatus === ValidationStatus.AVAILABLE}
								isValidationInProgress={isValidationInProgress} 
								setAvailable={setAvailable} 
								setPassed={setPassed} 
								setFailed={setFailed}/>
						</Collapse.Panel>
					)
				})
			}</Collapse>
		:
			<Text italic style={{paddingLeft: '1em'}}>No datasets for this experiment are available for this experiment yet.</Text>
	)
}

function FlexBar(props) {
	// Displays children in a horizontal flexbox, maximizing the space between the children.
	// Two children will appear at the left and right ends of the bar with whitespace in between.
	return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1em' }}>{props.children}</div>
}

interface LanePanelProps {
	lane: LaneInfo
	canValidate: boolean
	canReset: boolean
	isValidationInProgress: boolean
	setPassed: (lane: LaneInfo) => void
	setFailed: (lane: LaneInfo) => void
	setAvailable: (lane: LaneInfo) => void
}

function LanePanel({ lane, canValidate, canReset, isValidationInProgress, setPassed, setFailed, setAvailable }: LanePanelProps) {
	const dispatch = useAppDispatch()
  const datasetsById = useAppSelector(selectDatasetsByID)
	const [datasets, setDatasets] = useState<Dataset[]>([])

  useEffect(() => {
    Promise.all(lane.datasets.map(async (dataset) => {
      const response = await dispatch(api.datasets.get(dataset.datasetID))
      return response.data
    }))
    .then((values) => {
      setDatasets(values as Dataset[])})
	}, [datasetsById])

  const handleAddComment = useCallback(
    (id, comment) => {
        return dispatch(addArchivedComment(id, comment))
    }, [dispatch])

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

  const layoutStyle = {
    borderRadius: 8,
    overflow: 'hidden',
    width: 'calc(100% - 8px)',
    maxWidth: 'calc(100% - 8px)',
    backgroundColor: '#fff',
  }

  const siderStyle = {
    backgroundColor: '#fff',
  }

	return (
		<>
			<FlexBar style={{padding: '1em'}}>
				{urlSet.size > 0 ? (
					// Display the list of metrics url's associated with the lane's datasets.
					<List>
						{[...urlSet].map((url, index) => {
							return (
								<List.Item key={`URL-${index}`}>
									<a style={{fontSize: 'medium'}} href={url} rel="external noopener noreferrer" target="_blank">
										View Run Metrics
									</a>
								</List.Item>
							)
						})}
					</List>
				) : (
					<Text italic>(Run metrics unavailable)</Text>
				)}
				<Space>
					{canValidate && 
						<Text strong>Validate lane:</Text>
					}
					{canReset && 
						<Popconfirm
							title="Reset the lane's validation status?"
							okText={'Yes'}
							cancelText={'No'}
							onConfirm={() => {
								setAvailable(lane)
							}}
						>
							<Button disabled={isValidationInProgress || lane.validationStatus === ValidationStatus.AVAILABLE}>Reset</Button>
						</Popconfirm>
						
					}
					
					{canValidate &&
							<Button disabled={isValidationInProgress || lane.validationStatus === ValidationStatus.PASSED} onClick={() => setPassed(lane)}>Passed</Button>
					}

					{canValidate &&
						<Popconfirm
							title="Set the lane's validation status to Failed?"
							okText={'Yes'}
							cancelText={'No'}
							onConfirm={() => {
								setFailed(lane)
							}}
							placement={'topRight'}
						>
							<Button disabled={isValidationInProgress || lane.validationStatus === ValidationStatus.FAILED}>Failed</Button>
						</Popconfirm>
					}
				</Space>
			</FlexBar>
      <Layout style={layoutStyle}>
        <Content style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <ReadsPerSampleGraph lane={lane} />
          <Title level={5}>{title}</Title>
        </Content>
        <Sider width="30%" style={siderStyle}>
          <DatasetArchivedCommentsBox datasets={datasets} handleAddComment={handleAddComment}/>
        </Sider>
			</Layout>
		</>
	)
}

export default ExperimentRunValidation
