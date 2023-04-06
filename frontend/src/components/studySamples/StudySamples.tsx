import { Collapse, Typography } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import { StudySampleList } from '../../models/study_samples'
import StudyStepSamplesTable from './StudyStepSamplesTable'

const { Text, Title } = Typography

interface StudySamplesProps {
	studySamples: StudySampleList
	hideEmptySteps: boolean
}

function StudySamples({ studySamples, hideEmptySteps }: StudySamplesProps) {
	let renderedSteps = [...studySamples.steps]
	if (hideEmptySteps) {
		renderedSteps = renderedSteps.filter((step) => step.samples.length > 0)
	}
	return (
		<>
			<Collapse>
				{renderedSteps.map((step) => {
					const hasSamples = step.samples.length > 0
					return (
						<Collapse.Panel key={step.stepOrderID} header={<><span>{step.stepOrder+": "}</span><Link to={`/lab-work/step/${step.stepID}`}>{step.stepName}</Link></>} extra={<Title level={4} style={{margin: '0'}}>{step.samples.length}</Title>}>
							{hasSamples ? (
								<StudyStepSamplesTable step={step} />
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
