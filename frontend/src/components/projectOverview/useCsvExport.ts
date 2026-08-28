import { useCallback, useMemo } from 'react'
import { csvEscape } from './utils'

// Custom hook that creates the final CSV export function.
// Input: array of objects.
// Output: function returning Promise<string>, ready for ExportButton.
export const useCreateCsvExportFunction = <T extends Record<string, unknown>>(items: T[]): (() => Promise<string>) => {
	//// FUNCTION DEFINITIONS

	///1-A

	// Returns the object keys as strings.
	// Example: { id: 1, name: "A" } -> ["id", "name"]
	const getObjectKeys = useCallback(<T extends object>(item: T): string[] => {
		return Object.keys(item)
	}, [])

	// Gets CSV headers from the first item of the array.
	// Headers are simple string keys.
	// If there are no items, returns [].
	const getHeadersFromItems = useCallback(
		<T extends object>(items: T[]): string[] => {
			if (items.length === 0) {
				return []
			}

			return getObjectKeys(items[0])
		},
		[getObjectKeys],
	)

	// Public helper for getting headers.
	// It wraps getHeadersFromItems so the rest of the code calls one clear function.
	const getHeaders = useCallback(
		<T extends object>(items: T[]): string[] => {
			return getHeadersFromItems<T>(items)
		},
		[getHeadersFromItems],
	)

	///1-B
	// Returns object keys, but typed as keyof T.
	// Example: Array<"id" | "name"> instead of string[].
	const getTypedObjectKeys = useCallback(<T extends object>(item: T): Array<keyof T> => {
		return Object.keys(item) as Array<keyof T>
	}, [])

	// Gets export fields from the first item.
	// These fields are typed and are used to safely read values from each row.
	const getTypedFieldsFromItems = useCallback(
		<T extends object>(items: T[]): Array<keyof T> => {
			if (items.length === 0) {
				return []
			}

			return getTypedObjectKeys(items[0])
		},
		[getTypedObjectKeys],
	)

	// Public helper for getting typed export fields.
	const getExportFields = useCallback(
		<T extends object>(items: T[]): Array<keyof T> => {
			return getTypedFieldsFromItems<T>(items)
		},
		[getTypedFieldsFromItems],
	)

	// Converts the items into CSV rows.
	// Each item becomes one row.
	// Each field becomes one cell in that row.
	const formatExportRows = <T extends Record<string, unknown>>(items: T[], fields: Array<keyof T>) => {
		return items.map((item) =>
			fields.map((field) => {
				const value = item[field]

				// Formats date-like fields.
				// Note: field is normally a key, so this check only works if field itself is a Date.
				if (field instanceof Date) {
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

	//// FUNCTION CALLS

	// Builds CSV headers once when items change.
	const headers = useMemo(() => {
		return getHeaders(items)
	}, [items])

	// Builds typed fields once when items change.
	const exportFields = useMemo(() => {
		return getExportFields(items)
	}, [items])

	// Builds CSV rows once when items or fields change.
	const rows = useMemo(() => {
		return formatExportRows(items, exportFields)
	}, [items, exportFields])

	// Returns the function used by the export button.
	// When called, it creates the final CSV string.
	return useCallback(() => {
		const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n')

		return Promise.resolve(csv)
	}, [headers, rows])
}

//////////////////////////////////////////////////////////////
