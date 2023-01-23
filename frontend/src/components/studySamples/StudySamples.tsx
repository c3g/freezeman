import { Collapse, Table, Typography } from 'antd'
import React from 'react'
import { useAppSelector } from '../../hooks'
import { StudySampleList } from '../../models/study_samples'
import { selectSamplesByID } from '../../selectors'
import StudyStepSamplesTable from './StudyStepSamplesTable'

const { Title } = Typography

/*
	TODO:
		Add default columns to studies tables. Use PaginatedList for the table?

		After adding samples to my study, the sample table was still empty because
		the study samples state was not refreshed.

		keep track of which step is expanded and restore it if the user navigates
		back to the study page (activeKey?)
*/

interface StudySamplesProps {
	studySamples: StudySampleList
}

function StudySamples({studySamples} : StudySamplesProps) {

	const samplesByID = useAppSelector(selectSamplesByID)

	return (
		<Collapse>
			{studySamples.steps.map(step => {
				return (
					<Collapse.Panel key={step.stepID} header={step.stepName} extra={<Title level={5}>{step.samples.length}</Title>}>
						<StudyStepSamplesTable step={step}/>
					</Collapse.Panel>
				)
			})}
		</Collapse>
	)
}

export default StudySamples