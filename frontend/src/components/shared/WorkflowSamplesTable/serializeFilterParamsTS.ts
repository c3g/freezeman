/*
 * serializeFilterParams.js
 */

import { FILTER_TYPE } from '../../../constants'
import {
	FilterSet,
	isMetadataFilterValue,
	isRangeFilterValue,
	isStringArrayFilterValue,
	isStringFilterValue,
	MetadataFilterValue,
} from '../../../models/paged_items'

export default function serializeFilterParamsWithDescriptions(filters: FilterSet) {
	const params = {}

	function hasSpaces(string) {
		return string.indexOf(' ') >= 1
	}

	Object.keys(filters).forEach((key) => {
		const value = filters[key]?.value
		const description = filters[key]?.description

		if (value === undefined) return

		if (description === undefined) return

		switch (description.type) {
			case FILTER_TYPE.DATE_RANGE:
			case FILTER_TYPE.RANGE: {
				if (isRangeFilterValue(value)) {
					params[key + '__gte'] = value.min
					params[key + '__lte'] = value.max
				}

				break
			}

			case FILTER_TYPE.SELECT: {
				key = description.mode === 'multiple' ? key + '__in' : key
				if (isStringArrayFilterValue(value)) {
					params[key] = [...(value.join(','))]
				} else if (isStringFilterValue(value)) {
					params[key] = [value]
				}
				break
			}

			case FILTER_TYPE.INPUT: {
				if (isStringFilterValue(value)) {
					const options = filters[key].options
					const isBatch = description.batch && hasSpaces(value)

					if (isBatch) {
						params[key] = value
						break
					}

					if (options) {
						if (options.recursiveMatch) key += '__recursive'
						else if (options.exactMatch) key += '__startswith'
						else key += '__icontains'
					} else {
						key += '__icontains'
					}

					params[key] = value
				}
				break
			}

			case FILTER_TYPE.INPUT_NUMBER:
			case FILTER_TYPE.INPUT_OBJECT_ID: {
				if (value) {
					key += '__in'
					params[key] = value
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
				}
				break
			}

			default: {
				throw new Error('Invalid filter type')
			}
		}
	})

	return params
}
