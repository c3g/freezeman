import { Collapse, Space, Spin, Switch, Tabs, Typography } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId, WorkflowStepOrder } from '../../models/fms_api_models'
import { initStudySamplesSettings, setHideEmptySteps, setStudyExpandedSteps, setStudyStepSamplesTab } from '../../modules/studySamples/actions'
import { StudySampleList, StudySampleStep, StudyUXSettings, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectHideEmptySteps, selectStepsByID, selectStudiesByID, selectStudySettingsByID, selectWorkflowsByID } from '../../selectors'
import RefreshButton from '../RefreshButton'
import CompletedSamplesTable from './CompletedSamplesTable'
import StudyStepSamplesTable from './StudyStepSamplesTable'
import { WarningOutlined } from '@ant-design/icons'
import { loadStudySamples } from '../../modules/studySamples/services'

const { Text, Title } = Typography

interface StudySamplesProps {
	studyID: FMSId
}

function StudySamples({ studyID }: StudySamplesProps) {
	const dispatch = useAppDispatch()
	const hideEmptySteps = useAppSelector(selectHideEmptySteps)
	const studySettingsByID = useAppSelector(selectStudySettingsByID)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const uxSettings = studySettingsByID[studyID]

	const studiesById = useAppSelector(selectStudiesByID)
	const study = studiesById[studyID]

	const workflowsById = useAppSelector(selectWorkflowsByID)
	const workflow = workflowsById[study.workflow_id]	

	// Init UX settings for study if not already created.
	useEffect(() => {
		const settings = studySettingsByID[studyID]
		if(settings) {
			const stepOrderIDs = workflow.steps_order.map(step_order => step_order.id)
			dispatch(initStudySamplesSettings(studyID, stepOrderIDs))
		}
	}, [studyID, studySettingsByID, dispatch, workflow.steps_order])
	

	const handleHideEmptySteps = useCallback((hide: boolean) => {
		dispatch(setHideEmptySteps(hide))
	}, [dispatch])

	const handleRefresh = useCallback(() => {
		setRefreshing(true)
	}, [studyID])

	useEffect(() => {
		if (refreshing) {
			setRefreshing(false)
		}
	}, [refreshing])	// Clear the refreshing flag when studySamples changes

	const handleExpand = useCallback((keys: string | string[]) => {
		if(Array.isArray(keys)) {
			// keys are StepOrder ID's
			dispatch(setStudyExpandedSteps(studyID, keys.map(key => parseInt(key))))
		}
	}, [studyID, dispatch])

	// Restore expanded panels state if the settings are available
	const expandedPanelKeys : FMSId[] = []
	if (uxSettings && uxSettings.stepSettings) {
		for(const stepKey in uxSettings.stepSettings) {
			const stepSettings = uxSettings.stepSettings[stepKey]
			if (stepSettings?.expanded === true) {
				expandedPanelKeys.push(stepSettings.stepOrderID)
			}
		}
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
				{!refreshing && workflow.steps_order.filter((stepOrder) => stepOrder.order >= study.start && stepOrder.order <= study.end).map((stepOrder) => {
					// Call StepPanel as a function because the child of Collapse must be a CollapsePanel, not a StepPanel
					return <StepPanel stepOrder={stepOrder} studyID={studyID} />
				})}
			</Collapse>
		</>
	)
}

interface StepPanelProps {
	stepOrder: WorkflowStepOrder
	studyID: FMSId
	uxSettings?: StudyUXStepSettings
}
function StepPanel({stepOrder, studyID, uxSettings} : StepPanelProps) {
	const dispatch = useAppDispatch()
	const stepsByID = useAppSelector(selectStepsByID)
	const hideEmptySteps = useAppSelector(selectHideEmptySteps)

	const [studySampleStep, setStudySampleStep] = useState<StudySampleStep | undefined>()
	const countString = studySampleStep && `${studySampleStep.completedCount} / ${studySampleStep.sampleCount + studySampleStep.completedCount}`
	const countTitle =  studySampleStep && `${studySampleStep.completedCount} of ${studySampleStep.sampleCount + studySampleStep.completedCount} samples are completed`
	
	const completedSamples = studySampleStep?.completed.filter(completed => completed.removedFromWorkflow === false)
	const removedSamples = studySampleStep?.completed.filter(completed => completed.removedFromWorkflow === true)
	const hasRemovedSamples = removedSamples ? removedSamples.length > 0 : undefined

	const removedTitle = removedSamples
		? (removedSamples.length === 1 ? `1 sample was removed from study at this step` : `${removedSamples.length} samples were removed from study at this step`)
		: undefined

	const readyTab = `Ready for Processing (${studySampleStep?.sampleCount ?? '...'})`
	const completedTab = <Text>{`Completed (${completedSamples?.length ?? '...'})`}</Text>
	const removedTab = 
		<Space size={'small'}>
			<Text>{`Removed (${removedSamples?.length})`}</Text>
			<WarningOutlined style={{color: 'red'}} title={removedTitle}/>
		</Space>
		
	const goToLab = <Link style={{marginRight: '1rem'}} to={`/lab-work/step/${studySampleStep?.stepID}`}>{'Go to Processing'}</Link>

	const handleTabSelection = useCallback((activeKey: string) => {
		if (studySampleStep) {
			dispatch(setStudyStepSamplesTab(studyID, studySampleStep.stepOrderID, activeKey as any))
		}
	}, [dispatch, studySampleStep, studyID])

	useEffect(() => {
		(async () => {
			// console.warn("Dipatching", studyID, stepOrder)
			const studySamples = await loadStudySamples(studyID, stepOrder)
			setStudySampleStep(studySamples)
			// console.warn("Dispatched", studyID, stepOrder, studySamples?.sampleCount, studySamples?.completed)
		})()
	}, [studyID, stepOrder])

	return (!hideEmptySteps || (studySampleStep?.sampleCount ?? 0) > 0 || (studySampleStep?.completedCount ?? 0) > 0
		? <Collapse.Panel
			key={stepOrder.id}
			header={
				<Space align="baseline">
					<Text strong={true} style={{fontSize: 16}}>{stepOrder.order}</Text>
					<Title level={5}>{stepOrder.step_name}</Title>
				</Space>
			}
			showArrow={true}
			extra={
				<>
					<Space>
						{hasRemovedSamples && <WarningOutlined style={{color: 'red'}} title={removedTitle}/>}
						{countString && countTitle
							? <Title level={4} style={{ margin: '0' }} title={countTitle}>
								{countString}
							  </Title>
							: <Spin />}
					</Space>
				</>
			}
			style={{backgroundColor: 'white'}}
		>
			<Tabs defaultActiveKey='ready' activeKey={uxSettings?.selectedSamplesTab} tabBarExtraContent={goToLab} size='small' onChange={handleTabSelection}>
				<Tabs.TabPane tab={readyTab} key='ready'>
					{studySampleStep ? <StudyStepSamplesTable studyID={studyID} step={studySampleStep} stepOrder={stepOrder} settings={uxSettings}/> : <Spin />}
				</Tabs.TabPane>
				<Tabs.TabPane tab={completedTab} key='completed'>
					{completedSamples ? <CompletedSamplesTable completedSamples={completedSamples}/> : <Spin />}
				</Tabs.TabPane>
				{hasRemovedSamples && 
				<Tabs.TabPane tab={removedTab} key='removed'>
					{removedSamples && <CompletedSamplesTable completedSamples={removedSamples}/>}
				</Tabs.TabPane>
				}
			</Tabs>
		</Collapse.Panel>
		: null)
}

export default StudySamples
