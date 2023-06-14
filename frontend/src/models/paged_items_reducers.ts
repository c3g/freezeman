import { FilterDescription, FilterOptions, FilterValue, PagedItems, SortBy } from "./paged_items"
import { clearFilters, removeFilter, setFilterOptions, setFilterValue } from "./filter_set_reducers"
import { FMSTrackedModel } from "./fms_api_models"

/*
	A set of reducer functions for updating objects that conform to the PagedItems interface.
	These functions should be used by any reducers that handle paged items.
*/

// LIST action reducers

export function reduceListRequest<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P): P {
	return {
		...pagedItems,
		isFetching: true,
		error: undefined
	}
}

export type ReduceListReceiveType<T> = {
	items: T[],
	pageNumber: number, 
	pageSize: number, 
	totalCount: number
}
export function reduceListReceive<T extends FMSTrackedModel, P extends PagedItems<T>>(
	pagedItems: P, 
	data: ReduceListReceiveType<T>): P {
	return {
		...pagedItems,
		isFetching: false,
		totalCount: data.totalCount,
		items: data.items.map(item => item.id),
		page: {
			...pagedItems.page,
			pageNumber: data.pageNumber,
			limit: data.pageSize
		}
	}
}

export function reduceListError<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P, error: any): P {
	return {
		...pagedItems,
		isFetching: false,
		error
	}
}

// Filters reducers

export function reduceSetFilter<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P, description: FilterDescription, value: FilterValue): P {
	return {
		...pagedItems,
		filters: setFilterValue(pagedItems.filters, description, value)
	}
}

export function reduceSetFilterOptions<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P, description: FilterDescription, options: FilterOptions): P {
	return {
		...pagedItems,
		filters: setFilterOptions(pagedItems.filters, description, options)
	}
}

export function reduceRemoveFilter<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P, description: FilterDescription): P {
	return {
		...pagedItems,
		filters: removeFilter(pagedItems.filters, description)
	}
}

export function reduceClearFilters<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P): P {
	return {
		...pagedItems,
		filters: clearFilters(pagedItems.filters)
	}
}

export function reduceSetSortBy<T extends FMSTrackedModel, P extends PagedItems<T>>(pagedItems: P, sortBy: SortBy): P {
	return {
		...pagedItems,
		sortBy
	}
}