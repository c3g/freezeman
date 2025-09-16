import React, { useMemo } from 'react'
import WorkflowDefintions from './WorkflowDefinitions'
import { useAppSelector } from '../../hooks'
import { selectWorkflowsByID } from '../../selectors'
import { getAllItems } from '../../models/frontend_models'


function WorkflowDefinitionsRoute() {

	const workflowState = useAppSelector(selectWorkflowsByID)
	const workflows = useMemo(() => {
		const workflows = getAllItems(workflowState)
		workflows.sort((a, b) => a.name.localeCompare(b.name))
		return workflows
	}, [workflowState])

	return <WorkflowDefintions workflows={workflows}/>
}

export default WorkflowDefinitionsRoute