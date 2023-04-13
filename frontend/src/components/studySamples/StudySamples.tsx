import { Collapse, Space, Switch, Tabs, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { setHideEmptySteps } from '../../modules/studySamples/actions'
import { StudySampleList, StudySampleStep } from '../../modules/studySamples/models'
import { selectHideEmptySteps } from '../../selectors'
import RefreshButton from '../RefreshButton'
import CompletedSamplesTable from './CompletedSamplesTable'
import StudyStepSamplesTable from './StudyStepSamplesTable'

const { Text, Title } = Typography

interface StudySamplesProps {
	studySamples: StudySampleList
	refreshSamples: () => void
}

function StudySamples({ studySamples, refreshSamples }: StudySamplesProps) {
	const dispatch = useAppDispatch()
	const hideEmptySteps = useAppSelector(selectHideEmptySteps)
	const [refreshing, setRefreshing] = useState<boolean>(false)

	let renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.samples.length > 0 || step.completed.length > 0)
	}

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
			<Collapse bordered={true}>
				{renderedSteps.map((step) => {
					const hasSamples = step.samples.length > 0 || step.completed.length > 0
					const totalSampleCount = step.samples.length + step.completed.length
					const countString = `${step.completed.length} / ${totalSampleCount}`

					return (
						<Collapse.Panel
							key={step.stepOrderID}
							header={
								<Space align="baseline">
									<Text strong={true} style={{fontSize: 16}}>{step.stepOrder}</Text>
									<Text>{step.stepName}</Text>
								</Space>
							}
							showArrow={true}
							extra={
								<>
									<Space>
										<Title level={4} style={{ margin: '0' }}>
											{countString}
										</Title>
									</Space>
								</>
							}
							style={{backgroundColor: 'white'}}
						>
						
							{hasSamples ? (
								<SamplesTabs step={step}/>
							) : (
								<Text style={{ margin: '1rem', lineHeight: '2rem'}}>No samples are at this step</Text>
							)}
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

interface SampleTabContainerProps {
	step: StudySampleStep
}
function SamplesTabs({step}: SampleTabContainerProps) {

	const readyTab = `Ready for Processing (${step.samples.length})`
	const completedTab = `Completed (${step.completed.length})`
	const goToLab = <Link style={{marginRight: '1rem'}} to={`/lab-work/step/${step.stepID}`}>{'Go to Processing'}</Link>

	return (
		<Tabs defaultActiveKey='ready' tabBarExtraContent={goToLab} size='small'>
			<Tabs.TabPane tab={readyTab} key='ready'>
				<StudyStepSamplesTable step={step}/>
			</Tabs.TabPane>
			<Tabs.TabPane tab={completedTab} key='completed'>
				<CompletedSamplesTable completedSamples={step.completed}/>
			</Tabs.TabPane>
		</Tabs>
	)
}

export default StudySamples
