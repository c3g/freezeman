import { IdentifiedTableColumnType } from "./PagedItemsColumns"


/**
 * Utility function to to set the 'sorter' flags on table columns, by column ID.
 * @param columns 
 * @param columnIDs 
 * @param sorterValue 
 * @returns 
 */
export function setDynamicSorters<T>(
	columns: IdentifiedTableColumnType<T>[],
	columnIDs: string[],
	sorterValue: boolean
) {
	return columns.map((column) => {
		if (columnIDs.includes(column.columnID)) {
			return {
				...column,
				sorter: sorterValue
			}
		} else {
			return column
		}
	})
}

/**
 * Utility function to set column widths, using columnID / width pairs.
 * Returns a list of column definitions with the widths set for any columns
 * that matched a key.
 * 
 * @param columns column definitions
 * @param columnWidths map of columnID -> width
 * @returns column definitions
 */
export function setColumnWidths<T>(
	columns: IdentifiedTableColumnType<T>[],
	columnWidths: {[key : string]: number}

) {
	return columns.map((column) => {
		if (column.columnID in columnWidths) {
			return {
				...column,
				width: columnWidths[column.columnID]
			}
		} else {
			return column
		}
	})
}