import { getFilterPropsForDescription } from "./getFilterPropsTS"
import { FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc } from "../../../models/paged_items"

import { IdentifiedTableColumnType } from "./SampleTableColumns"


export function mergeColumnsAndFilters(
	columns: IdentifiedTableColumnType<any>[], 
	filterDescriptions: FilterDescriptionSet, 
	filterKeys: FilterKeySet,
	filters: FilterSet,
	setFilter : SetFilterFunc,
	setFilterOption : SetFilterOptionFunc
	) {
	const mergedColumns = columns.map(column => {
		const columnID = column.columnID
		let filter = filterDescriptions[columnID]
		if (filter) {
			const key = filterKeys[columnID]
			if (key) {
				filter = {
					...filter,
					key
				}
			} else {
				console.warn(`Filter key is missing for column ${columnID}`)
			}

			const filterValue = filters[key]

			const props = getFilterPropsForDescription(column, filter, filterValue, setFilter, setFilterOption)

			return {
				...column,
				...props
			}
		}
		return column
	})
	return mergedColumns
}