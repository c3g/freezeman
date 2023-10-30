import { Step } from "../../models/frontend_models"

/**
 * Lookup a step specification by display name and return its value, or undefined
 * if the spec does not exist.
 * @param step Step
 * @param name string
 * @returns Value or undefined
 */
export function getStepSpecificationValue(step: Step, name: string) {
	const spec = step.step_specifications.find(s => s.name === name)
	return spec?.value
}

/**
 * Check if a Step has a specification with the given display name.
 * @param step Step
 * @param name string
 * @returns 
 */
export function hasSpecification(step: Step, name: string) {
	return step.step_specifications.some(spec => spec.name === name)
}

/**
 * Check if a Step has a specification with the given display name and value.
 * @param step Step
 * @param name string
 * @param value string
 * @returns 
 */
export function hasSpecifiedValue(step: Step, name: string, value: string) {
	return step.step_specifications.some(spec => spec.name === name && spec.value === value)
}