import React from 'react'
import { useAppSelector } from '../../hooks'
import { Protocol } from '../../models/frontend_models'
import { StudySampleStep } from '../../modules/studySamples/models'
import { selectProtocolsByID, selectStepsByID } from '../../selectors'
import { getColumnsForStep } from '../shared/WorkflowSamplesTable/ColumnSets'
import { SampleColumnID } from '../shared/WorkflowSamplesTable/SampleTableColumns'
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

	// Same columns as labwork, but we don't want the Project column, since the user
	// is already in the project details page.
	const columns = getColumnsForStep(stepDefinition, protocol).filter(col => col.columnID !== SampleColumnID.PROJECT)
	
	return (
		<WorkflowSamplesTable
			sampleIDs={step.samples ?? []}
			columns={columns}
		/>
	)
}

export default StudyStepSamplesTable

