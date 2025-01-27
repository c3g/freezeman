import { Button, Flex, TableProps } from "antd"
import { SortBy } from "../../models/paged_items"
import { IdentifiedTableColumnType } from "./PagedItemsColumns"
import React, { useCallback, useEffect, useRef } from "react"
import { SortAscendingOutlined, SortDescendingOutlined } from "@ant-design/icons"


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
	sorterValue: boolean,
	multiple = false
) {
	return columns.map((column) => {
		if (columnIDs.includes(column.columnID)) {
			return {
				...column,
				sorter: sorterValue ? (multiple ? { multiple: 1 } : true) : false
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
	columnWidths: {[key : string]: number | string}

) {
	return columns.map((column) => {
		if (column.columnID in columnWidths) {
			return {
				...column,
				width: columnWidths[column.columnID],
        marginRight: '20px'
			}
		} else {
			return column
		}
	})
}
