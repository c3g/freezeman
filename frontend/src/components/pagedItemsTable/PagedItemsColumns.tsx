import { TableColumnType } from "antd"

/**
 * Base type for column definitions used in PagedItems tables. 
 * 
 * We use explicit column ID's to match column definitions with filter definitions.
 */
export interface IdentifiedTableColumnType<T> extends TableColumnType<T> {
	columnID: string
}
