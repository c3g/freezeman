import { FMSId, FMSTrackedModel } from "./fms_api_models"
import { FetchedObject, ItemsByID } from "./frontend_models"

// Models for paged items, used in redux to hold lists of objects

export interface FilterOption {
	label: string
	value: string
}

export interface FilterDescription {
	type: string
	key: string
	label: string
	mode?: 'multiple'
	recursive?: boolean
	batch?: boolean
	placeholder?: string
	options?: FilterOption[]
	dynamicOptions?: () => FilterOption[]	// A function that generates options when the filter is initialized.
	width?: React.CSSProperties['width']
	detached?: boolean	// TODO remove this after filter groups are redone
	defaultMin?: number
}

export interface FilterDescriptionSet {
	[key: string]: FilterDescription
}

export type StringFilterValue = string
export type StringArrayFilterValue = string[]
export type RangeFilterValue = { min?: string | number, max?: string | number }
export type MetadataFilterValue = { name: string, value?: string }[]

export type FilterValue = StringFilterValue | StringArrayFilterValue | RangeFilterValue | MetadataFilterValue | undefined

// Callback function definitions for functions that are passed to filter components.
export type SetFilterFunc = (filterKey: string, value: FilterValue, description: FilterDescription) => void
export type SetFilterOptionFunc = (filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => void
export type SetFixedFilterFunc = (filter: FilterSetting) => void
export type FilterValidationFunc = (string: string) => boolean
export type SetSortByFunc = (sortBy: SortBy) => void

export interface FilterOptions {
	[key: string]: boolean
}

// 1. Add filter description to redux
// 2. Update setFilter action to include filter description
// 3. Write a new version of serializeFilterProps to get description from state rather than from a filter config file
export interface FilterSetting {
	value: FilterValue
	options?: FilterOptions
	description?: FilterDescription		// Include filter description in redux state for filter serialization.
}

export interface FilterSet {
	[key: string]: FilterSetting
}

export interface SortBy {
	key?: string
	order?: 'ascend' | 'descend'
}

// Maps column ID's to filter key string (django keys)
export interface FilterKeySet {
	[key: string]: string
}

// A type representing an ID associated with an object displayed in a table.
// Usually this is an FMSId, but doesn't have to be.
export type DataID = number // | string ?

// Any object is pageable
export type PageableData = object

export interface PagedItems {
	readonly isFetching: boolean
	readonly error?: any
	readonly items: readonly FMSId[]
	readonly totalCount: number
	readonly filters: FilterSet
	readonly fixedFilters: FilterSet
	readonly sortBy: SortBy
	readonly page?: {
		readonly pageNumber?: number		// Move to using page number instead of offset
		readonly offset?: number
		readonly limit?: number
		readonly ignoreError?: string
	}
	readonly stale: boolean
}

interface PagedItem extends FMSTrackedModel, FetchedObject, PageableData {}


export interface PagedItemsByID<T extends PagedItem> extends PagedItems {
	readonly itemsByID: ItemsByID<T>
}

// Create a PagedItems instance, with all properties set to defaults.
export function createPagedItems(fixedFilters?: FilterSet) : PagedItems {
	const DEFAULT_PAGED_ITEMS: PagedItems = {
		isFetching: false,
		items: [],
		totalCount: 0,
		fixedFilters: fixedFilters ?? {},
		filters: {},
		sortBy: {},
		page: {
			limit: 20
			// Note: The pageNumber is left undefined intentionally. A page number
			// should only be set when the page items are loaded.
		},
		stale: false
	}
	return {...DEFAULT_PAGED_ITEMS}
}

// Create a PagedItemsByID instance, with all properties set to defaults.
export function createPagedItemsByID<T extends PagedItem>(fixedFilters?: FilterSet): PagedItemsByID<T> {
	return {
		itemsByID: {},
		...createPagedItems(fixedFilters)
	}
}

// Create a FilterSetting object for a fixed filter, from a key and a value.
export function createFixedFilter(filterType: string, filterKey: string, value: FilterValue): FilterSetting {
	return {
		value,
		description: {
			type: filterType,
			key: filterKey,
			label: ''
		}
	}
}

// TYPE GUARDS FOR FILTER VALUES

export function isStringFilterValue(value?: FilterValue): value is StringFilterValue {
	if (value) {
		return typeof value === 'string'
	}
	return false
}

export function isStringArrayFilterValue(value?: FilterValue): value is StringArrayFilterValue {
	if (value) {
		return Array.isArray(value)
	}
	return false
}

export function isRangeFilterValue(value?: FilterValue): value is RangeFilterValue {
	if (value) {
		const v = value as RangeFilterValue
		return ('min' in v) || ('max' in v)
	}
	return false
}

export function isMetadataFilterValue(value?: FilterValue): value is MetadataFilterValue {
	if (Array.isArray(value)) {
		return (value as Array<any>).every(v => ('name' in v))
	}
	return false
}
