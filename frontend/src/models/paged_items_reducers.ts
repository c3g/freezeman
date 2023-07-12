import { clearFilters, removeFilter, setFilterOptions, setFilterValue } from "./filter_set_reducers"
import { ObjectId } from "./frontend_models"
import { FilterDescription, FilterOptions, FilterSetting, FilterValue, PagedItems, SortBy } from "./paged_items"

/*
	A set of reducer functions for updating objects that conform to the PagedItems interface.
	These functions should be used by any reducers that handle paged items.
*/

// LIST action reducers

export function reduceListRequest<P extends PagedItems>(pagedItems: P): P {
	return {
		...pagedItems,
		isFetching: true,
		error: undefined
	}
}

export type ReduceListReceiveType = {
	items: ObjectId[],
	pageNumber: number, 
	pageSize: number, 
	totalCount: number
}

export function reduceListReceive<P extends PagedItems>(
	pagedItems: P, 
	data: ReduceListReceiveType): P {

	return {
		...pagedItems,
		isFetching: false,
		totalCount: data.totalCount,
		items: data.items,
		page: {
			...pagedItems.page,
			pageNumber: data.pageNumber,
			limit: data.pageSize
		}
	}
}

export function reduceListError<P extends PagedItems>(pagedItems: P, error: any): P {
	return {
		...pagedItems,
		isFetching: false,
		error
	}
}

// Filters reducers

export function reduceSetFixedFilter<P extends PagedItems>(pagedItems: P, filter: FilterSetting): P {
	if (filter.description) {
		return {
			...pagedItems,
			fixedFilters: setFilterValue(pagedItems.fixedFilters, filter.description, filter.value),
		}
	} else {
		return pagedItems
	}
}

export function reduceSetFilter<P extends PagedItems>(pagedItems: P, description: FilterDescription, value: FilterValue): P {
	return {
		...pagedItems,
		filters: setFilterValue(pagedItems.filters, description, value)
	}
}

export function reduceSetFilterOptions<P extends PagedItems>(pagedItems: P, description: FilterDescription, options: FilterOptions): P {
	return {
		...pagedItems,
		filters: setFilterOptions(pagedItems.filters, description, options)
	}
}

export function reduceRemoveFilter<P extends PagedItems>(pagedItems: P, description: FilterDescription): P {
	return {
		...pagedItems,
		filters: removeFilter(pagedItems.filters, description)
	}
}

export function reduceClearFilters<P extends PagedItems>(pagedItems: P): P {
	return {
		...pagedItems,
		filters: clearFilters(pagedItems.filters)
	}
}

export function reduceSetSortBy<P extends PagedItems>(pagedItems: P, sortBy: SortBy): P {
	return {
		...pagedItems,
		sortBy
	}
}

export function reduceSetPageSize<P extends PagedItems>(pagedItems: P, pageSize: number) : P {
	return {
		...pagedItems,
		page: {
			...pagedItems.page,
			limit: pageSize
		}
	}
}