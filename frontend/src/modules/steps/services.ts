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

/**
 * Check if a Step has a specification with the given display name.
 * @param step Step
 * @param displayName string
 * @returns 
 */
export function hasSpecification(step: Step, displayName: string) {
	return step.step_specifications.some(spec => spec.display_name === displayName)
}

/**
 * Check if a Step has a specification with the given display name and value.
 * @param step Step
 * @param displayName string
 * @param value string
 * @returns 
 */
export function hasSpecifiedValue(step: Step, displayName: string, value: string) {
	return step.step_specifications.some(spec => spec.display_name === displayName && spec.value === value)
}