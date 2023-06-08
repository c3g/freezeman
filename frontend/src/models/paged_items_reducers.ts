import { AnyFetchedModel, FetchedItemsByID, FetchedModel, FilterDescription, FilterOptions, FilterValue, PagedItems } from "./paged_items"
import { clearFilters, removeFilter, setFilterOptions, setFilterValue } from "./filter_set_reducers"
import { FMSTrackedModel } from "./fms_api_models"

/*
	A set of reducer functions for updating objects that conform to the PagedItems interface.
	These functions should be used by any reducers that handle paged items.
*/

// GET action reducers
export function reduceGetRequest<T extends FMSTrackedModel, P extends PagedItems<T>>(
	pagedItems: P,
	itemID: number
): P {
	// Add a new, empty object containing just an id and isFetching set to true to itemsByID
	const item: AnyFetchedModel = {
		id: itemID,
		isFetching: true,
		error: undefined,
		isLoaded: false,
		isRemoving: false,
		didFail: undefined,
	}

	return {
		...pagedItems,
		itemsByID: {
			...pagedItems.itemsByID,
			[itemID]: item
		}
	}
}

export function reduceGetReceive<T extends FMSTrackedModel, P extends PagedItems<T>>(
	pagedItems: P,
	item: T
): P {
	const object: FetchedModel<T> = {
		...item,
		isFetching: false,
		error: undefined,
		isLoaded: true,
		isRemoving: false,
		didFail: false,
	}
	return {
		...pagedItems,
		itemsByID: {
			...pagedItems.itemsByID,
			[item.id]: object
		}
	}
}

export function reduceGetError<T extends FMSTrackedModel, P extends PagedItems<T>>(
	pagedItems : P,
	itemID: number,
	error: any
): P {
	const item : AnyFetchedModel = {
		id: itemID,
		error,
		didFail: true,
		isFetching: false,
		isRemoving: false,
		isLoaded: false,
	}
	return {
		...pagedItems,
		[itemID]: item
	}
}

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
	function createFetchedItemsByID(items: T[]): FetchedItemsByID<T> {
		const itemsByID : FetchedItemsByID<T> = {}
		items.forEach(item => {
			if (item.id) {
				itemsByID[item.id] = {
					...item,
					isFetching: false,
					isRemoving: false,
					isLoaded: false,
					didFail: undefined,
				}
			}
		})
		return itemsByID	
	}

	return {
		...pagedItems,
		isFetching: false,
		totalCount: data.totalCount,
		items: data.items.map(item => item.id),
		itemsByID: {
			...pagedItems.itemsByID,
			...createFetchedItemsByID(data.items)
		},
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
