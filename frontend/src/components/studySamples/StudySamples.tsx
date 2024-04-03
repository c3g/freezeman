import { Collapse, Space, Switch, Tabs, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { setHideEmptySteps, setStudyExpandedSteps, setStudyStepSamplesTab } from '../../modules/studySamples/actions'
import { StudySampleStep, StudySampleList, StudyUXSettings, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectHideEmptySteps, selectStudySettingsByID, selectStudyTableStatesByID } from '../../selectors'
import RefreshButton from '../RefreshButton'
import CompletedSamplesTable from './CompletedSamplesTable'
import StudyStepSamplesTable from './StudyStepSamplesTable'
import { WarningOutlined } from '@ant-design/icons'
import { PaginationParameters } from '../WorkflowSamplesTable/WorkflowSamplesTable'

const { Text, Title } = Typography

interface StudySamplesProps {
	studyID: FMSId
	studySamples: StudySampleList
	refreshSamples: () => void
}

function StudySamples({ studyID, studySamples, refreshSamples }: StudySamplesProps) {
	const dispatch = useAppDispatch()
	const hideEmptySteps = useAppSelector(selectHideEmptySteps)
	const studySettingsByID = useAppSelector(selectStudySettingsByID)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [uxSettings, setUXSettings] = useState<StudyUXSettings>()

	// Init UX settings for study if not already created.
	useEffect(() => {
		const settings = studySettingsByID[studyID]
		if(settings) {
			// settings for all steps should be initialized as soon as the study is loaded
			setUXSettings(settings)
		}
	}, [studyID, studySamples, studySettingsByID, dispatch])
	

	const handleHideEmptySteps = useCallback((hide: boolean) => {
		dispatch(setHideEmptySteps(hide))
	}, [dispatch])

	function handleRefresh() {
		setRefreshing(true)
		refreshSamples()
	}

	useEffect(() => {
		setRefreshing(false)
	}, [studySamples])	// Clear the refreshing flag when studySamples changes

	const handleExpand = useCallback((keys: string | string[]) => {
		if(Array.isArray(keys)) {
			// keys are StepOrder ID's
			dispatch(setStudyExpandedSteps(studyID, keys.map(key => parseInt(key))))
		}
	}, [studyID, dispatch])

	// Restore expanded panels state if the settings are available
	const expandedPanelKeys : FMSId[] = []
	if (uxSettings) {
		for(const stepKey in uxSettings.stepSettings) {
			const stepSettings = uxSettings.stepSettings[stepKey]
			if (stepSettings?.expanded === true) {
				expandedPanelKeys.push(stepSettings.stepOrderID)
			}
		}
	}

	// If Hide Empty Steps then don't render steps with no ready or completed samples.
	let renderedSteps: StudySampleStep[] = []

	renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.ready.count > 0 || step.completed.count > 0)
	}

	return (
		<>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
				<Title level={4} style={{ marginTop: '1.5rem' }}>Samples</Title>
				<Space>
					<Text>Hide empty steps</Text>
					<Switch 
						checked={hideEmptySteps}
						onChange={handleHideEmptySteps}
						title='Hide steps for which there are no ready or completed samples'
					/>
					<RefreshButton
						refreshing={refreshing}
						onRefresh={handleRefresh}
						title={'Update with the latest state of the samples in the lab'}
					/>
				</Space>
			</div>
			<Collapse bordered={true} onChange={handleExpand} activeKey={expandedPanelKeys}>
				{renderedSteps.map((step) => {
					const countString = `${step.completed.count} / ${step.ready.count + step.completed.count + step.removed.count}`
					const countTitle = `${step.completed.count} of ${step.ready.count + step.completed.count + step.removed.count} samples are completed`					
					const removedTitle = step.removed.count === 1 ? `1 sample was removed from study at this step` : `${step.removed.count} samples were removed from study at this step`

					// Call StepPanel as a function because the child of Collapse must be a CollapsePanel, not a StepPanel
					return (
						<Collapse.Panel
							key={step.stepOrderID}
							header={
								<Space align="baseline">
									<Text strong={true} style={{fontSize: 16}}>{step.stepOrder}</Text>
									<Title level={5}>{step.stepName}</Title>
								</Space>
							}
							showArrow={true}
							extra={
								<>
									<Space>
										{step.removed.count > 0 && <WarningOutlined style={{color: 'red'}} title={removedTitle}/>}
										<Title level={4} style={{ margin: '0' }} title={countTitle}>
											{countString}
										</Title>
									</Space>
								</>
							}
							style={{backgroundColor: 'white'}}
						>
							<StepTabs step={step} studyID={studyID} uxSettings={uxSettings?.stepSettings[step.stepOrderID]} removedTitle={removedTitle} />
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

interface StepPanelProps {
	step: StudySampleStep
	studyID: FMSId
	uxSettings?: StudyUXStepSettings
	removedTitle: string
}
function StepTabs({step, studyID, uxSettings, removedTitle} : StepPanelProps) {
	const dispatch = useAppDispatch()
	const tableStates = useAppSelector((state) => selectStudyTableStatesByID(state)[studyID]?.steps[step.stepOrderID]?.tables)
		
	const hasRemovedSamples = step.removed.count > 0

	const readyTab = `Ready for Processing (${step.ready.count})`
	const completedTab = <Text>{`Completed (${step.completed.count})`}</Text>
	const removedTab = 
		<Space size={'small'}>
			<Text>{`Removed (${step.removed.count})`}</Text>
			<WarningOutlined style={{color: 'red'}} title={removedTitle}/>
		</Space>
		
	const goToLab = <Link style={{marginRight: '1rem'}} to={`/lab-work/step/${step.stepID}`}>{'Go to Processing'}</Link>

	function handleTabSelection(activeKey: string) {
		dispatch(setStudyStepSamplesTab(studyID, step.stepOrderID, activeKey as any))
	}

	return (
		<Tabs defaultActiveKey='ready' activeKey={uxSettings?.selectedSamplesTab} tabBarExtraContent={goToLab} size='small' onChange={handleTabSelection}>
			<Tabs.TabPane tab={readyTab} key='ready'>
				<StudyStepSamplesTable studyID={studyID} step={step} tableState={tableStates?.ready} settings={uxSettings}/>
			</Tabs.TabPane>
			<Tabs.TabPane tab={completedTab} key='completed'>
				<CompletedSamplesTable studyID={studyID} step={step} tableState={tableStates?.completed} settings={uxSettings} workflowAction={'NEXT_STEP'}/>
			</Tabs.TabPane>
			{hasRemovedSamples && 
			<Tabs.TabPane tab={removedTab} key='removed'>
				<CompletedSamplesTable studyID={studyID} step={step} tableState={tableStates?.removed} settings={uxSettings} workflowAction={'DEQUEUE_SAMPLE'}/>
			</Tabs.TabPane>
			}
		</Tabs>
	)
}

export default StudySamples
