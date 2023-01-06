import { Workflow } from '../../models/frontend_models'

/**
 * StructuredWorkflows is a simply key based object that uses a workflow structure
 * name as a key and maps the key to an array of workflows with that structure.
 */
export interface StructuredWorkflows {
	[key: string]: Workflow[]
}

export function createStructuredWorkflows(workflows: Workflow[]) {
	const structuredWorkflows: StructuredWorkflows = {}
	workflows.forEach((wf) => {
		const structure = wf.structure
		if (!structuredWorkflows[structure]) {
			structuredWorkflows[structure] = []
		}
		structuredWorkflows[structure].push(wf)
	})
	return structuredWorkflows
}
