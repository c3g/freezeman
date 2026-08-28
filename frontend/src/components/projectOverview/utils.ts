import { Project } from '../../models/frontend_models'

export const csvEscape = (value: unknown) => {
	const stringValue = value == null ? '' : String(value)
	return `"${stringValue.replace(/"/g, '""')}"`
}

/*
 * This function formats the project submission rows for CSV export.
 * It takes an array of projects and an array of fields to include in the export.
 * It returns an array of arrays, where each inner array represents a row in the CSV.
 */

export const formatProjectSubmissionRows = (projects: Project[], fields: Array<keyof Project>) => {
	return projects.map((project) =>
		fields.map((field) => {
			const value = project[field]

			if (field === 'created_at') {
				return value
					? new Date(String(value)).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric',
						})
					: ''
			}

			return value
		}),
	)
}
