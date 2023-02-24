import { Step } from "../../models/frontend_models"

/**
 * Lookup a step specification by display name and return its value, or undefined
 * if the spec does not exist.
 * @param step Step
 * @param displayName string
 * @returns Value or undefined
 */
export function getStepSpecificationValue(step: Step, displayName: string) {
	const spec = step.step_specifications.find(s => s.display_name === displayName)
	return spec?.value
}