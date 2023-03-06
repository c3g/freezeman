import { FilterDescriptionSet, FilterSet, getFilterPropsForDescription, SetFilterFunc, SetFilterOptionFunc } from "./getFilterProps"
import { IdentifiedTableColumnType } from "./SampleTableColumns"
import { FilterKeySet } from "./SampleTableFilters"


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