import { Collapse, Space, Switch, Tabs, Typography } from 'antd'
import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { setHideEmptySteps } from '../../modules/studySamples/actions'
import { StudySampleList, StudySampleStep } from '../../modules/studySamples/models'
import { selectHideEmptySteps } from '../../selectors'
import CompletedSamplesTable from './CompletedSamplesTable'
import StudyStepSamplesTable from './StudyStepSamplesTable'

const { Text, Title } = Typography

interface StudySamplesProps {
	studySamples: StudySampleList
}

function StudySamples({ studySamples }: StudySamplesProps) {
	const dispatch = useAppDispatch()
	const hideEmptySteps = useAppSelector(selectHideEmptySteps)

	let renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.samples.length > 0)
	}

	const handleHideEmptySteps = useCallback((hide: boolean) => {
		dispatch(setHideEmptySteps(hide))
	}, [])

	return (
		<>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: '0.5rem' }}>
				<Title level={4} style={{ marginTop: '1.5rem' }}>Samples</Title>
				<Space>
					<Text>Hide empty steps</Text>
					<Switch checked={hideEmptySteps} onChange={handleHideEmptySteps}></Switch>
				</Space>
			</div>
			<Collapse>
				{renderedSteps.map((step) => {
					const hasSamples = step.samples.length > 0 || step.completed.length > 0
					const totalSampleCount = step.samples.length + step.completed.length
					const countString = `${step.completed.length} / ${totalSampleCount}`

					return (
						<Collapse.Panel
							key={step.stepOrderID}
							header={
								<Space align="baseline">
									<Title level={5}>{step.stepName}</Title>
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
			<Tabs.TabPane tab={readyTab} key='ready' disabled={step.samples.length === 0}>
				<StudyStepSamplesTable step={step}/>
			</Tabs.TabPane>
			<Tabs.TabPane tab={completedTab} key='completed' disabled={step.completed.length === 0}>
				<CompletedSamplesTable completedSamples={step.completed}/>
			</Tabs.TabPane>
		</Tabs>
	)
}

export default StudySamples
