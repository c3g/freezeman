import React from 'react'
import { useAppSelector } from '../../hooks'
import { Protocol } from '../../models/frontend_models'
import { StudySampleStep } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { getColumnsForStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable from '../shared/WorkflowSamplesTable/WorkflowSamplesTable'



interface StudyStepSamplesTableProps {
	step: StudySampleStep,
	showCompleted: boolean
}

function StudyStepSamplesTable({step, showCompleted} : StudyStepSamplesTableProps) {

	const protocolsByID = useAppSelector(selectProtocolsByID)
	const stepsByID = useAppSelector(selectStepsByID)

	const protocol : Protocol | undefined = protocolsByID[step.protocolID]
	if(!protocol) {
		return null
	}
	const stepDefinition = stepsByID[step.stepID]
	if(!stepDefinition) {
		return null
	}

	const columns = getColumnsForStep(stepDefinition, protocol)

	const samplesToDisplay = showCompleted ? step.completedSamples : step.samples
	
	return (
		<WorkflowSamplesTable
			sampleIDs={samplesToDisplay ?? []}
			columns={columns}
		/>
	)
}

export default StudyStepSamplesTable

