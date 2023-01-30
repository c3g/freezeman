import { Checkbox, Collapse, Switch, Typography } from 'antd'
import React, { useState } from 'react'
import { StudySampleList } from '../../models/study_samples'
import { flushExperimentRunLaunch } from '../../modules/experimentRuns/actions'
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
						<Collapse.Panel key={step.stepID} header={`${step.stepName}`} extra={<Title level={4} style={{margin: '0'}}>{step.samples.length}</Title>}>
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
