import React from 'react'
import { SearchOutlined } from '@ant-design/icons'
import moment from 'moment'
import InputFilter from '../../filters/FilterProps/InputFilter'
import InputNumberFilter from '../../filters/FilterProps/InputNumberFilter'
import SelectFilter from '../../filters/FilterProps/SelectFilter'
import RadioFilter from '../../filters/FilterProps/RadioFilter'
import RangeFilterComponent from '../../filters/FilterProps/RangeFilter'
import DateRangeFilter from '../../filters/FilterProps/DateRange'
import { nullize } from '../../../utils/nullize'

import { FILTER_TYPE } from '../../../constants'
import { TableColumnType } from 'antd'
import { FilterDescription, FilterValidationFunc, FilterSetting, isRangeFilterValue, SetFilterFunc, SetFilterOptionFunc, FilterDescriptionSet, FilterSet } from '../../../models/paged_items'



// There's a little hack that tacks an 'options' object onto the AntD table column objects.
interface FreezemanColumnType<T> extends TableColumnType<T> {
	options?: {
		label: string
		value: string
	}[]
}

/**
 * Get the filter props for a column, given the column definition and a set of filter descriptions.
 * This function matches the column's dataIndex property to a key in the filter description set, and if 
 * found, returns the filter props for the column.
 * 
 * This is intended for use by the legacy tables, to replace the JS version of `getFilterProps`. New
 * tables should be using `addFiltersToColumns` to set up filter props on columns.
 * @param column 
 * @param descriptions 
 * @param filters 
 * @param setFilter 
 * @param setFilterOption 
 * @returns 
 */
export function getFilterPropsIncludingDescriptions(
	column: FreezemanColumnType<any>,
	descriptions: FilterDescriptionSet, 
	filters: FilterSet,
	setFilter: SetFilterFunc,
	setFilterOption: SetFilterOptionFunc) {
	
	const key = column.dataIndex
	if (key && typeof key === 'string') {
		const description = descriptions[key]
		if (description) {
			const filterSetting = filters[key]	// Note: filterSetting is allowed to be undefined here.
			return getFilterPropsForDescription(description, filterSetting, setFilter, setFilterOption)
		}
	}	
	return undefined
}

/**
 * Get the filter properties for a column, given a corresponding filter description.
 * @param column 
 * @param description 
 * @param filter 
 * @param setFilter 
 * @param setFilterOption 
 * @returns 
 */
export function getFilterPropsForDescription(
  description: FilterDescription, 
  filter: FilterSetting | undefined, 
  setFilter: SetFilterFunc, 
  setFilterOption: SetFilterOptionFunc) {
    switch (description.type) {
			case FILTER_TYPE.INPUT:
				return getInputFilterProps(description, filter, setFilter, setFilterOption)
			case FILTER_TYPE.INPUT_NUMBER:
				return getInputNumberFilterProps(description, filter, setFilter, isValidInteger)
			case FILTER_TYPE.INPUT_OBJECT_ID:
				return getInputNumberFilterProps(description, filter, setFilter, isValidObjectID)
			case FILTER_TYPE.SELECT:
				if (description.mode !== 'multiple') return getRadioFilterProps(description, filter, setFilter)
				return getSelectFilterProps(description, filter, setFilter)
			case FILTER_TYPE.RANGE:
				return getRangeFilterProps(description, filter, setFilter)
			case FILTER_TYPE.DATE_RANGE:
				return getDateRangeFilterProps(description, filter, setFilter)
		}
		throw new Error(`Unknown column filter description type: "${description.type}"`)
  }

function isValidObjectID(value: string) {
	// Object ID's must be postive integer values, so we verify that the string
	// contains only digits (and are tolerant of whitespace)
	const regex = /^\s*\d+\s*$/
	return regex.test(value)
}

function isValidInteger(value: string) {
	const numericValue = Number.parseInt(value)
	return !Number.isNaN(numericValue)
}

function getInputFilterProps(
	description: FilterDescription,
	filter : FilterSetting | undefined,
	setFilter: SetFilterFunc,
	setFilterOption: SetFilterOptionFunc
) {
	const filterKey = description.key
	const value = filter?.value
	const options = filter?.options

	return {
		filterIcon: getFilterIcon(Boolean(value)),
		filterDropdown: ({ confirm, visible }) => {
			const props = {
				value,
				options,
				description,
				filterKey,
				setFilter,
				setFilterOption,
				confirm,
				visible,
			}
			return <InputFilter {...props} />
		},
	}
}

function getInputNumberFilterProps(
	description: FilterDescription,
	filter: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	validationFunc: FilterValidationFunc
) {
	const filterKey = description.key
	const value = filter?.value

	return {
		filterIcon: getFilterIcon(Boolean(value)),
		filterDropdown: ({ confirm, visible }) => {
			const props = {
				value,
				validationFunc,
				description,
				filterKey,
				setFilter,
				confirm,
				visible,
			}
			return <InputNumberFilter {...props} />
		},
	}
}

function getSelectFilterProps(description: FilterDescription, filter: FilterSetting | undefined, setFilter: SetFilterFunc) {
	const filterKey = description.key
	const value = filter?.value
	const options = description.options || []
	const title = description.label

	return {
		filterIcon: getFilterIcon(Boolean(value)),
		filterDropdown: ({ confirm, visible }) => {
			const props = {
				value,
				title,
				options,
				filterKey,
				setFilter,
				confirm,
				visible,
				description,
			}
			return <SelectFilter {...props} />
		},
	}
}

function getRadioFilterProps(description: FilterDescription, filter: FilterSetting | undefined, setFilter : SetFilterFunc) {
	const filterKey = description.key
	const value = filter?.value
	const options = description.options || []

	return {
		filterIcon: getFilterIcon(Boolean(value)),
		filterDropdown: ({ confirm, visible }) => {
			const props = {
				value,
				options,
				description,
				filterKey,
				setFilter,
				confirm,
				visible,
			}

			return <RadioFilter {...props} />
		},
	}
}

function getRangeFilterProps(description: FilterDescription, filter: FilterSetting | undefined, setFilter : SetFilterFunc) {
	const defaultMin = description.defaultMin ?? 0
	const filterKey = description.key
	const value = filter?.value

  let minValue, maxValue

  if(isRangeFilterValue(value)) {
    minValue = value.min
    maxValue = value.max
  }

	return {
		filterIcon: getFilterIcon(Boolean(value)),
		filterDropdown: ({ confirm, visible }) => {
			const props = {
				minValue,
				defaultMin,
				maxValue,
				filterKey,
				setFilter,
				confirm,
				visible,
				description,
			}

			return <RangeFilterComponent {...props} />
		},
	}
}

function getDateRangeFilterProps(description: FilterDescription, filter: FilterSetting | undefined, setFilter : SetFilterFunc) {
	const filterKey = description.key
	const value = filter?.value

  let minValue, maxValue
  if (isRangeFilterValue(value)) {
    minValue = value && nullize(value.min) && moment(value.min)
	  maxValue = value && nullize(value.max) && moment(value.max)
  }

	return {
		filterIcon: getFilterIcon(Boolean(value)),
		filterDropdown: ({ confirm, visible }) => {
			const props = {
				minValue,
				maxValue,
				filterKey,
				setFilter,
				confirm,
				visible,
				description,
			}
			return <DateRangeFilter {...props} />
		},
	}
}

function getFilterIcon(filtered) {
	return <SearchOutlined style={{ color: filtered ? '#ff9800' : undefined }} />
}
