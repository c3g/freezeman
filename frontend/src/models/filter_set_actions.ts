import { FilterDescription, FilterValue } from "./paged_items"


function createSetFilterAction(SET_FILTER: string) {
	const setFilter = (filterKey: string, value: FilterValue, description: FilterDescription) => {
		return {
			type: SET_FILTER,
			description,
			value
		}
	}
	return setFilter
}

function createSetFilterOptionsAction(SET_FILTER_OPTIONS: string) {
	const setFilterOptions = (filterKey: string, optionName: string, optionValue: boolean, description: FilterDescription) => {
		return {
			type: SET_FILTER_OPTIONS,
			description,
			options: {
				[optionName]: optionValue
			}
		}
	}
	return setFilterOptions
}

function createClearFiltersAction(CLEAR_FILTERS: string) {
	const clearFilters = () => {
		return {
			type: CLEAR_FILTERS
		}
	}
	return clearFilters
}

export interface FilterActionTypes {
	SET_FILTER: string
	SET_FILTER_OPTION: string
	CLEAR_FILTERS: string
}

export function createFilterActionTypes(prefix: string): FilterActionTypes {
	return {
		SET_FILTER: `${prefix}.SET_FILTER`,
		SET_FILTER_OPTION: `${prefix}.SET_FILTER_OPTION`,
		CLEAR_FILTERS: `${prefix}.CLEAR_FILTERS`
	}
}

export function createFiltersActions(filterActionTypes: FilterActionTypes) {
	return {
		setFilter: createSetFilterAction(filterActionTypes.SET_FILTER),
		setFilterOption: createSetFilterOptionsAction(filterActionTypes.SET_FILTER_OPTION),
		clearFilters: createClearFiltersAction(filterActionTypes.CLEAR_FILTERS)
	}
}


// export function setFilterOptions(filterKey: string, description: FilterDescription, options: FilterOptions) {
// 	return {
// 		type: SET_FILTER_OPTION,
// 		description,
// 		options
// 	}
// }

// export function removeFilter(filterKey: string, description: FilterDescription) {
// 	return {
// 		type: REMOVE_FILTER,
// 		description

// 	}
// }

// export function clearFilters() {
// 	return {
// 		type: CLEAR_FILTERS
// 	}
// }