import React from 'react'
import WorkflowDefintions from './WorkflowDefinitions'
import { useAppSelector } from '../../hooks'
import { selectWorkflowsByID } from '../../selectors'
import { getAllItems } from '../../models/frontend_models'


function WorkflowDefinitionsRoute() {

	const workflowState = useAppSelector(selectWorkflowsByID)
	const workflows = getAllItems(workflowState)

	return <WorkflowDefintions workflows={workflows}/>
}

export default WorkflowDefinitionsRoute