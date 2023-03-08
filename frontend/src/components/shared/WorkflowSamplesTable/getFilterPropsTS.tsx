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
import { FilterDescription, FilterValidationFunc, FilterSetting, isRangeFilterValue, SetFilterFunc, SetFilterOptionFunc } from '../../../models/paged_items'



// There's a little hack that tacks an 'options' object onto the AntD table column objects.
interface FreezemanColumnType<T> extends TableColumnType<T> {
	options?: {
		label: string
		value: string
	}[]
}

// TODO - PORT EXISTING JS VERSION OF getFilterProps TO USE THIS VERSION

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
  column: FreezemanColumnType<any>, 
  description: FilterDescription, 
  filter: FilterSetting | undefined, 
  setFilter: SetFilterFunc, 
  setFilterOption: SetFilterOptionFunc) {
    switch (description.type) {
			case FILTER_TYPE.INPUT:
				return getInputFilterProps(column, description, filter, setFilter, setFilterOption)
			case FILTER_TYPE.INPUT_NUMBER:
				return getInputNumberFilterProps(column, description, filter, setFilter, isValidInteger)
			case FILTER_TYPE.INPUT_OBJECT_ID:
				return getInputNumberFilterProps(column, description, filter, setFilter, isValidObjectID)
			case FILTER_TYPE.SELECT:
				if (description.mode !== 'multiple') return getRadioFilterProps(column, description, filter, setFilter)
				return getSelectFilterProps(column, description, filter, setFilter)
			case FILTER_TYPE.RANGE:
				return getRangeFilterProps(column, description, filter, setFilter)
			case FILTER_TYPE.DATE_RANGE:
				return getDateRangeFilterProps(column, description, filter, setFilter)
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
	column: FreezemanColumnType<any>,
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
	column: FreezemanColumnType<any>,
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

function getSelectFilterProps(column: FreezemanColumnType<any>, description: FilterDescription, filter: FilterSetting | undefined, setFilter: SetFilterFunc) {
	const filterKey = description.key
	const value = filter?.value
	const options = description.options || column.options || []
	const title = column.title

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

function getRadioFilterProps(column: FreezemanColumnType<any>, description: FilterDescription, filter: FilterSetting | undefined, setFilter : SetFilterFunc) {
	const filterKey = description.key
	const value = filter?.value
	const options = description.options || column.options || []

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

function getRangeFilterProps(column: FreezemanColumnType<any>, description: FilterDescription, filter: FilterSetting | undefined, setFilter : SetFilterFunc) {
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

function getDateRangeFilterProps(column: FreezemanColumnType<any>, description: FilterDescription, filter: FilterSetting | undefined, setFilter : SetFilterFunc) {
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
