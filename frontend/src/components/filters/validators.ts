
export function isValidInteger(value: string) {
	const numericValue = Number.parseInt(value)
	return !Number.isNaN(numericValue)
}

export function isValidObjectID(value: string) {
	// Object ID's must be postive integer values, so we verify that the string
	// contains only digits (and are tolerant of whitespace)
	const regex = /^\s*\d+\s*$/
	return regex.test(value)
}
