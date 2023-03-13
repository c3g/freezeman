import React from 'react'
import { useAppSelector } from '../../hooks'
import { Protocol } from '../../models/frontend_models'
import { StudySampleStep } from '../../models/study_samples'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { getColumnsForStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable from '../shared/WorkflowSamplesTable/WorkflowSamplesTable'



interface StudyStepSamplesTableProps {
	step: StudySampleStep
}

function StudyStepSamplesTable({step} : StudyStepSamplesTableProps) {

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
	
	return (
		<WorkflowSamplesTable
			sampleIDs={step.samples ?? []}
			columns={columns}
		/>
	)
}

export default StudyStepSamplesTable

