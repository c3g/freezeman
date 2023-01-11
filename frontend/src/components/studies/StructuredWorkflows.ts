import { Workflow } from '../../models/frontend_models'

/**
 * StructuredWorkflows is a simply key based object that uses a workflow structure
 * name as a key and maps the key to an array of workflows with that structure.
 */
export interface StructuredWorkflows {
	[key: string]: Workflow[]
}

export function createStructuredWorkflows(workflows: Workflow[]): StructuredWorkflows {
	return workflows.reduce((structure, wf) => {
		structure[wf.structure] = structure[wf.structure] ?? []
		structure[wf.structure].push(wf)
		return structure
	}, {})
}
