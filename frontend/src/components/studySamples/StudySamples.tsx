import { Collapse, Space, Spin, Switch, Tabs, Typography } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FMSId } from '../../models/fms_api_models'
import { initStudySamplesSettings, setHideEmptySteps, setStudyExpandedSteps, setStudyStepSamplesTab } from '../../modules/studySamples/actions'
import { PreStudySampleStep, StudySampleList, StudySampleStep, StudyUXSettings, StudyUXStepSettings } from '../../modules/studySamples/models'
import { selectHideEmptySteps, selectStudySettingsByID } from '../../selectors'
import RefreshButton from '../RefreshButton'
import CompletedSamplesTable from './CompletedSamplesTable'
import StudyStepSamplesTable from './StudyStepSamplesTable'
import { WarningOutlined } from '@ant-design/icons'
import { buildStudySamplesFromWorkflowStepOrder, fetchSamplesAndLibrariesForStep } from '../../modules/studySamples/services'

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
			const stepOrderIDs = studySamples.steps.map(step => step.stepOrder.id)
			dispatch(initStudySamplesSettings(studyID, stepOrderIDs))
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
	let renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.sampleNextStepsCount.step.count > 0 || step.completedSamplesCount.step.count > 0)
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
				{renderedSteps.map((preStep) => {
					// Call StepPanel as a function because the child of Collapse must be a CollapsePanel, not a StepPanel
					return StepPanel({preStep, studyID, uxSettings:uxSettings?.stepSettings[preStep.stepOrder.id]})
				})}
			</Collapse>
		</>
	)
}

interface StepPanelProps {
	preStep: PreStudySampleStep
	studyID: FMSId
	uxSettings?: StudyUXStepSettings
}
function StepPanel({preStep, studyID, uxSettings} : StepPanelProps) {
	const pageSize = 10

	const dispatch = useAppDispatch()
	const [step, setStep] = useState<StudySampleStep>()
	const [hasExpended, setHasExpanded] = useState(uxSettings?.expanded)
	const [loadingSamples, setLoadingSamples] = useState(false)

	const [pageNumberReady, setPageNumberReady] = useState(1)
	const [pageNumberCompleted, setPageNumberCompleted] = useState(1)
	const [pageNumberRemoved, setPageNumberRemoved] = useState(1)

	const completedSamples = useMemo(() => step?.completed.filter(completed => completed.removedFromWorkflow === false) ?? [], [step?.completed])
	const removedSamples = useMemo(() => step?.completed.filter(completed => completed.removedFromWorkflow === true) ?? [], [step?.completed])
	const hasRemovedSamples = removedSamples.length > 0

	useEffect(() => {
		buildStudySamplesFromWorkflowStepOrder(preStep).then((step) => setStep(step))
	}, [preStep])
	useEffect(() => {
		if (uxSettings?.expanded) {
			setHasExpanded(true)
		}
	}, [uxSettings?.expanded])
	useEffect(() => {
		if (uxSettings?.selectedSamplesTab && step && hasExpended && !loadingSamples) {
			(async () => {
				setLoadingSamples(true)
				switch (uxSettings?.selectedSamplesTab) {
					case "ready":
						await fetchSamplesAndLibrariesForStep(step.samples.slice(pageSize * (pageNumberReady - 1), pageSize * pageNumberReady))
						break
					case "completed":
						await fetchSamplesAndLibrariesForStep(completedSamples.slice(pageSize * (pageNumberCompleted - 1), pageSize * pageNumberCompleted).map((s) => s.sampleID))
						break
					case "removed":
						await fetchSamplesAndLibrariesForStep(removedSamples.slice(pageSize * (pageNumberRemoved - 1), pageSize * pageNumberRemoved).map((s) => s.sampleID))
						break
				}
				setLoadingSamples(false)
			})()
		}
	}, [step, hasExpended, pageNumberReady, pageNumberCompleted, pageNumberRemoved, uxSettings?.selectedSamplesTab, completedSamples, removedSamples, loadingSamples, uxSettings])

	const handleTabSelection = useCallback((activeKey: string) => {
		if (step) {
			dispatch(setStudyStepSamplesTab(studyID, step.stepOrderID, activeKey as any))
		}
	}, [dispatch, step, studyID])

	if (!step) {
		return <></>
	}
	
	const countString = `${step.completedCount} / ${step.sampleCount + step.completedCount}`
	const countTitle = `${step.completedCount} of ${step.sampleCount + step.completedCount} samples are completed`

	const removedTitle = removedSamples.length === 1 ? `1 sample was removed from study at this step` : `${removedSamples.length} samples were removed from study at this step`

	const readyTab = `Ready for Processing (${step.sampleCount})`
	const completedTab = <Text>{`Completed (${completedSamples.length})`}</Text>
	const removedTab = 
		<Space size={'small'}>
			<Text>{`Removed (${removedSamples.length})`}</Text>
			<WarningOutlined style={{color: 'red'}} title={removedTitle}/>
		</Space>
		
	const goToLab = <Link style={{marginRight: '1rem'}} to={`/lab-work/step/${step.stepID}`}>{'Go to Processing'}</Link>

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
						{hasRemovedSamples && <WarningOutlined style={{color: 'red'}} title={removedTitle}/>}
						<Title level={4} style={{ margin: '0' }} title={countTitle}>
							{countString}
						</Title>
					</Space>
				</>
			}
			style={{backgroundColor: 'white'}}
		>
			{loadingSamples ? <Spin /> :
				<Tabs defaultActiveKey='ready' activeKey={uxSettings?.selectedSamplesTab} tabBarExtraContent={goToLab} size='small' onChange={handleTabSelection}>
					<Tabs.TabPane tab={readyTab} key='ready'>
					<StudyStepSamplesTable studyID={studyID} step={step} settings={uxSettings} pagination={{
						totalCount: step.samples.length,
						pageNumber: pageNumberReady,
						pageSize,
						onChangePageNumber(pageNumber) { setPageNumberReady(pageNumber) },
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						onChangePageSize() {},
					}}/>
					</Tabs.TabPane>
					<Tabs.TabPane tab={completedTab} key='completed'>
						<CompletedSamplesTable completedSamples={completedSamples} pagination={{
						totalCount: completedSamples.length,
						pageNumber: pageNumberCompleted,
						pageSize,
						onChangePageNumber(pageNumber) { setPageNumberCompleted(pageNumber) },
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						onChangePageSize() {},
					}}/>
					</Tabs.TabPane>
					{hasRemovedSamples && 
						<Tabs.TabPane tab={removedTab} key='removed'>
							<CompletedSamplesTable completedSamples={removedSamples} pagination={{
							totalCount: removedSamples.length,
							pageNumber: pageNumberRemoved,
							pageSize,
							onChangePageNumber(pageNumber) { setPageNumberRemoved(pageNumber) },
							// eslint-disable-next-line @typescript-eslint/no-empty-function
							onChangePageSize() {},
						}}/>
						</Tabs.TabPane>
					}
				</Tabs>
			}
		</Collapse.Panel>
	)
}

export default StudySamples
