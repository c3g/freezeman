import { FilterDescription, FilterOptions, FilterSet, FilterSetting, FilterValue } from "./paged_items"

/*
	A set of reducer functions for updating FilterSet objects.
*/


export function setFilterValue(filterSet: FilterSet, description: FilterDescription, value: FilterValue): FilterSet {
	const { key } = description
	const filter: FilterSetting = {
		fixed: false,
		...filterSet[key],
		value,
		description,
	}
	return {
		...filterSet,
		[key] : filter
	}
}

export function setFilterOptions(filterSet: FilterSet, description: FilterDescription, options: FilterOptions): FilterSet {
	const { key } = description
	const oldFilter = filterSet[key]
	const filter: FilterSetting = {
		fixed: false,
		value: oldFilter?.value,
		...oldFilter,
		options: {
			...oldFilter?.options,
			...options
		},
		description,
	}
	return {
		...filterSet,
		[key]: filter
	}
}

export function setFilterFixed(filterSet: FilterSet, description: FilterDescription, fixed: boolean): FilterSet {
	const { key } = description
	const oldFilter = filterSet[key]
	const filter: FilterSetting = {
		value: oldFilter?.value,
		...oldFilter,
		fixed,
		description,
	}
	return {
		...filterSet,
		[key]: filter
	}
}

export function removeFilter(filterSet: FilterSet, description: FilterDescription): FilterSet {
	const filters = {
		...filterSet
	}
	delete filters[description.key]
	return filters
}

export function clearFilters(filterSet: FilterSet): FilterSet {
	// Clearing filters just returns an empty FilterSet object.
	if(Object.keys(filterSet).length === 0) {
		return filterSet
	} else {
		return {}
	}
}