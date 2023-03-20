import { Collapse, Radio, Space, Switch, Typography } from 'antd'
import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { setHideEmptySteps } from '../../modules/studySamples/actions'
import { StudySampleList } from '../../modules/studySamples/models'
import { selectHideEmptySteps } from '../../selectors'
import StudyStepSamplesTable from './StudyStepSamplesTable'

const { Text, Title } = Typography

interface StudySamplesProps {
	studySamples: StudySampleList
}

function StudySamples({ studySamples }: StudySamplesProps) {

	const dispatch = useAppDispatch()
	const hideEmptySteps = useAppSelector(selectHideEmptySteps)

	const [showCompleted, setShowCompleted] = useState<boolean>(true)

	let renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.samples.length > 0)
	}

	const handleHideEmptySteps = useCallback(
		(hide: boolean) => {
       		dispatch(setHideEmptySteps(hide))
    	}
	, [])

	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: '0.5rem'}}>
                <Title level={4} style={{marginTop: '1.5rem'}}>Samples</Title>
                <Space>
                    <Text>Hide empty steps</Text>
                    <Switch checked={hideEmptySteps} onChange={handleHideEmptySteps}></Switch>
					<Radio.Group
					optionType = 'button'
					buttonStyle = 'solid'
					options={
						[
							{label: 'Completed Samples', value: true},
							{label: 'Pending Samples', value: false}
						]
					}
					onChange={
						({target: {value}}) => {
							setShowCompleted(value)
						}
					}
					value={showCompleted}
				/>
                </Space>
            </div>
			<Collapse>
				{renderedSteps.map((step) => {
					const hasSamples = step.samples.length > 0 || step.completedSamples.length > 0
					const totalSampleCount = step.samples.length + step.completedSamples.length
					const countString = `${step.completedSamples.length} / ${totalSampleCount}`

					return (
						<Collapse.Panel 
							key={step.stepOrderID} 
							header={<Link to={`/lab-work/step/${step.stepID}`}>{step.stepName}</Link>} 
							extra={
								<Title level={4} style={{margin: '0'}}>{countString}</Title>
							}
						>
							{hasSamples ? (
								<StudyStepSamplesTable step={step} showCompleted={showCompleted}/>
							) : (
								<Text style={{ margin: '1rem' }}>No samples are at this step</Text>
							)}
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

export default StudySamples
