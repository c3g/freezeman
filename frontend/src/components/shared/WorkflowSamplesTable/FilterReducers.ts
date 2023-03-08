import { FilterDescription, FilterOptions, FilterSet, FilterSetting, FilterValue } from "../../../models/paged_items"


export function setFilterReducer(filterSet: FilterSet, description: FilterDescription, value: FilterValue): FilterSet {
	const { key } = description
	const filter = {
		...filterSet[key],
		value,
		description
	}
	return {
		...filterSet,
		[key] : filter
	}
}

export function setFilterOptionsReducer(filterSet: FilterSet, description: FilterDescription, options: FilterOptions): FilterSet {
	const { key } = description
	const oldFilter = filterSet[key]
	const filter: FilterSetting = {
		...oldFilter,
		options: {
			...oldFilter?.options,
			...options
		},
		description
	}
	return {
		...filterSet,
		[key]: filter
	}
}

export function removeFilterReducer(filterSet: FilterSet, description: FilterDescription): FilterSet {
	const filters = {
		...filterSet
	}
	delete filters[description.key]
	return filters
}

export function clearFiltersReducer(): FilterSet {
	return {}
}