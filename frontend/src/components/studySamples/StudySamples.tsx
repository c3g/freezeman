import { Collapse, Space, Switch, Tabs, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { initStudySamplesSettings, setHideEmptySteps, setStudyExpandedSteps, setStudyStepSamplesTab } from '../../modules/studySamples/actions'
import { StudySampleList, StudySampleStep, StudyUXSettings, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectHideEmptySteps, selectStudySettingsByID } from '../../selectors'
import RefreshButton from '../RefreshButton'
import CompletedSamplesTable from './CompletedSamplesTable'
import StudyStepSamplesTable from './StudyStepSamplesTable'

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
			setUXSettings(settings)
		} else {
			const stepIDs = studySamples.steps.map(step => step.stepID)
			dispatch(initStudySamplesSettings(studyID, stepIDs))
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
		if (refreshing) {
			setRefreshing(false)
		}
	}, [studySamples])

	const handleExpand = useCallback((keys: string | string[]) => {
		if(Array.isArray(keys)) {
			// keys are Step ID's
			dispatch(setStudyExpandedSteps(studyID, keys.map(key => parseInt(key))))
		}
	}, [studyID, dispatch])

	// Restore expanded panels state if the settings are available
	const expandedPanelKeys : FMSId[] = []
	if (uxSettings) {
		for(const stepKey in uxSettings.stepSettings) {
			const stepSettings = uxSettings.stepSettings[stepKey]
			if (stepSettings?.expanded === true) {
				expandedPanelKeys.push(stepSettings.stepID)
			}
		}
	}

	// If Hide Empty Steps then don't render steps with no ready or completed samples.
	let renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.samples.length > 0 || step.completed.length > 0)
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
					const countString = `${step.completedCount} / ${step.sampleCount + step.completedCount}`
					const countTitle = `${step.completedCount} of ${step.sampleCount + step.completedCount} samples are completed`

					return (
						<Collapse.Panel
							key={step.stepID}
							header={
								<Space align="baseline">
									<Title level={5}>{step.stepName}</Title>
								</Space>
							}
							showArrow={true}
							extra={
								<>
									<Space>
										<Title level={4} style={{ margin: '0' }} title={countTitle}>
											{countString}
										</Title>
									</Space>
								</>
							}
							style={{backgroundColor: 'white'}}
						>
							<SamplesTabs studyID={studyID} step={step} settings={uxSettings?.stepSettings[step.stepID]}/>
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

interface SampleTabContainerProps {
	studyID: FMSId
	step: StudySampleStep
	settings?: StudyUXStepSettings
}
function SamplesTabs({studyID, step, settings}: SampleTabContainerProps) {
	const dispatch = useAppDispatch()

	const readyTab = `Ready for Processing (${step.sampleCount})`
	const completedTab = `Completed (${step.completedCount})`
	const goToLab = <Link style={{marginRight: '1rem'}} to={`/lab-work/step/${step.stepID}`}>{'Go to Processing'}</Link>

	function handleTabSelection(activeKey: string) {
		dispatch(setStudyStepSamplesTab(studyID, step.stepID, activeKey as any))
	}

	return (
		<Tabs defaultActiveKey='ready' activeKey={settings?.selectedSamplesTab} tabBarExtraContent={goToLab} size='small' onChange={handleTabSelection}>
			<Tabs.TabPane tab={readyTab} key='ready'>
				<StudyStepSamplesTable studyID={studyID} step={step} settings={settings}/>
			</Tabs.TabPane>
			<Tabs.TabPane tab={completedTab} key='completed'>
				<CompletedSamplesTable completedSamples={step.completed}/>
			</Tabs.TabPane>
		</Tabs>
	)
}

export default StudySamples
