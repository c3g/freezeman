/*
 * serializeFilterParams.js
 */

import { FILTER_TYPE } from '../../constants'
import {
    FilterDescription,
    FilterOptions,
    FilterSet,
    FilterValue,
    isMetadataFilterValue,
    isRangeFilterValue,
    isStringArrayFilterValue,
    isStringFilterValue,
    MetadataFilterValue,
    SortBy,
} from '../../models/paged_items'
import { QueryParams } from '../../utils/api'
import dayjs from 'dayjs'

function hasSpaces(string: string) {
    return string.indexOf(' ') >= 1
}

export function paramsForFilterKeyAndSetting(key: string, value: FilterValue, description: FilterDescription, options?: FilterOptions) {
    const params: NonNullable<QueryParams> = {}

    switch (description.type) {
        case FILTER_TYPE.DATE_RANGE: {
            if (isRangeFilterValue(value)) {
                const dayAfterLast = dayjs(value.max).add(1, 'day').format('YYYY-MM-DD')
                params[key + '__gte'] = value.min
                params[key + '__lt'] = dayAfterLast
            } else {
                console.error('Invalid DATE_RANGE filter value', value)
            }

            break
        }

        case FILTER_TYPE.RANGE: {
            if (isRangeFilterValue(value)) {
                params[key + '__gte'] = value.min
                params[key + '__lte'] = value.max
            } else {
                console.error('Invalid RANGE filter value', value)
            }

            break
        }

        case FILTER_TYPE.SELECT: {
            key = description.mode === 'multiple' ? key + '__in' : key
            if (isStringArrayFilterValue(value)) {
                params[key] = value.join(',')
            } else if (isStringFilterValue(value)) {
                params[key] = value
            } else {
                console.error('Invalid SELECT filter value', value)
            }
            break
        }

        case FILTER_TYPE.INPUT: {
            if (isStringFilterValue(value)) {
                const isBatch = description.batch && hasSpaces(value)

                if (isBatch) {
                    params[key] = value
                    break
                }

                if (options) {
                    if (options.recursiveMatch) key += '__recursive'
                    else if (options.startsWith) key += '__startswith'
                    else if (options.exactMatch) {
                        /* Left blank because exact not uniformly accepted by the backend */
                    }
                    else key += '__icontains'
                } else {
                    key += '__icontains'
                }

                params[key] = value
            } else {
                console.error('Invalid INPUT filter value', value)
            }
            break
        }

        case FILTER_TYPE.INPUT_NUMBER:
        case FILTER_TYPE.INPUT_OBJECT_ID: {
            if (value) {
                key += '__in'
                params[key] = value
            } else {
                console.error('Invalid INPUT_NUMBER/INPUT_OBJECT_ID filter value', value)
            }
            break
        }

        case FILTER_TYPE.METADATA: {
            if (isMetadataFilterValue(value)) {
                //Serialize key-value metadata pairs in a string
                //with the form: name1__value1, name2__value2, name2__value3, etc
                params[key] = (value as MetadataFilterValue).reduce((serializedMetadata, metadata) => {
                    return serializedMetadata + metadata.name + '__' + (metadata.value ? metadata.value : '') + ','
                }, '')
            } else {
                console.error('Invalid METADATA filter value', value)
            }
            break
        }

        default: {
            throw new Error('Invalid filter type')
        }
    }

    return params
}

export default function serializeFilterParamsWithDescriptions(filters: FilterSet) {
    const params = Object.keys(filters).reduce<NonNullable<QueryParams>>((params, key) => {
        const setting = filters[key]
        if (setting.value && setting.description) {
            const paramsForFilterKey = paramsForFilterKeyAndSetting(key, setting.value, setting.description, setting.options)
            Object.assign(params, paramsForFilterKey)
        }
        return params
    }, {})

    return params
}

export function serializeSortByParams(sortByList: SortBy[]) {
    const prefixByOrder = {
        'ascend': '',
        'descend': '-',
    }
    return sortByList.length > 0
        ? sortByList.map((sort) => {
            const prefix = prefixByOrder[sort.order]
            return prefix + sort.key
        }).join(',')
        : undefined
}

/**
 * Converts a set of filters to a list of query params that can be sent to a 'list' endpoint.
 * @param filters 
 * @param sortBy 
 * @returns 
 */
export function filtersQueryParams(filters: FilterSet, sortByList: SortBy[]) {
    return { ...serializeFilterParamsWithDescriptions(filters), ordering: serializeSortByParams(sortByList) }
}