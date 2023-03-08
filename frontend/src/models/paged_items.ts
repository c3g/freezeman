import { FMSId, FMSTrackedModel } from "./fms_api_models"
import { ItemsByID } from "./frontend_models"

// Models for paged items, used in redux to hold lists of objects

export interface FilterDescription {
	type: string
	key: string
	label: string
	mode?: 'multiple'
	recursive?: boolean
	batch?: boolean
	placeholder?: string
	options?: { label: string; value: string }[]
	width?: number
	detached?: boolean
	defaultMin?: number
}

export interface FilterDescriptionSet {
	[key: string] : FilterDescription
}

export type StringFilterValue = string
export type StringArrayFilterValue = string[]
export type RangeFilterValue = {min?: string | number, max?: string | number}
export type MetadataFilterValue = {name: string, value?: string}[]

export type FilterValue = StringFilterValue | StringArrayFilterValue | RangeFilterValue | MetadataFilterValue | undefined

export type SetFilterFunc = (filterKey: string, value: FilterValue, description: FilterDescription) => void
export type SetFilterOptionFunc = (filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => void
export type FilterValidationFunc = (string) => boolean


export interface FilterOptions {
  exactMatch?: boolean
  recursiveMatch?: boolean
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
	[key: string] : string
}

export interface PagedItems<T extends FMSTrackedModel> {
	isFetching: boolean
	error?: any
	itemsByID: ItemsByID<T>
	items: FMSId[]
	totalCount: number
	filters: FilterSet
	sortBy: SortBy
	page?: {
		pageNumber?: number		// Move to using page number instead of offset
		offset?: number
		limit?: number
		ignoreError?: string
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

export function isRangeFilterValue(value?: FilterValue) : value is RangeFilterValue {
  if (value) {
    const v = value as RangeFilterValue
    return ('min' in v) || ('max' in v)
  }
  return false
}

export function isMetadataFilterValue(value?: FilterValue): value is MetadataFilterValue {
	if (value) {
		const v = value as MetadataFilterValue
		return ('name' in v)
	}
	return false
}
