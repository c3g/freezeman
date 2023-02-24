import { useParams } from 'react-router-dom'

/**
 * A useParams() function that gets a parameter by name and returns its value as a number.
 * If the parameter is not a number a warning is output to the console and undefined is returned.
 * 
 * This hook can be used by components to safely get ID parameters, which should be numbers.
 * 
 * @param paramName The name of the parameter
 * @returns The ID or undefined
 */
export function useIDParam(paramName: string) {
	let id : number | undefined

	const params = useParams()
	const value = params[paramName]
	if (value) {
		try {
			id = Number.parseInt(value)
		} catch(err) {
			console.warn(`useIDParam: ID parameter ${paramName} is not a number (${value})`)
		}
	}
	return id
}