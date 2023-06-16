import { getFilterPropsForDescription } from "./getFilterPropsTS"
import { FilterDescriptionSet, FilterKeySet, FilterSet, SetFilterFunc, SetFilterOptionFunc } from "../../../models/paged_items"

import { IdentifiedTableColumnType } from "./SampleTableColumns"

/**
 * Construct the columns for an antd table. This code takes column definitions and
 * adds filtering support to the columns.
 * 
 * Note that copies of the columns are returned - the original columns are not modified.
 * @param columns 				// Basic antd column definition
 * @param filterDescriptions 	// Filter definitions
 * @param filterKeys 			// Filter keys (filtering keys sent to django viewset endpoint)
 * @param filters 				// Current filter values, from redux
 * @param setFilter 			// Function to set a filter value (called by filter components)
 * @param setFilterOption 		// Function to set a filter option
 * @param addSorter				// If true, every column with a filter will include sorting controls.
 * @returns 
 */
export function addFiltersToColumns<T>(
	columns: IdentifiedTableColumnType<T>[], 
	filterDescriptions: FilterDescriptionSet, 
	filterKeys: FilterKeySet,
	filters: FilterSet,
	setFilter : SetFilterFunc = () => false,
	setFilterOption : SetFilterOptionFunc = () => false,
	addSorter = true
	) : IdentifiedTableColumnType<T>[]{
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

			// If the filter has a function to generate options dynamically then call it.
			if (filter.dynamicOptions) {
				filter = {
					...filter,
					options: filter.dynamicOptions()
				}
			}

			const props = getFilterPropsForDescription(column, filter, filterValue, setFilter, setFilterOption)

			return {
				...column,
				...props,
				// Only set sorter if it is not already defined in the column definition, 
				// so that components can override this default behaviour. A component can set a value
				// in the column definition to force sorter to be true or false, or leave it undefined
				// to get the default behaviour.
				sorter: column.sorter === undefined ? addSorter : column.sorter,
				key			// Column key needs to be set for sortBy functionality
			}
		}
		return column
	})
	return mergedColumns
}
