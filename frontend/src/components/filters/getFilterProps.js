import React from "react"
import {SearchOutlined} from "@ant-design/icons"
import moment from 'moment'
import InputFilter from './filterComponents/InputFilter'
// import DebouncedInputFilter from "./FilterProps/DebouncedInputFilter"
import InputNumberFilter from './filterComponents/InputNumberFilter'
import SelectFilter from './filterComponents/SelectFilter'
import RadioFilter from "./filterComponents/RadioFilter"
import RangeFilterComponent from "./filterComponents/RangeFilter"
import DateRangeFilter from "./filterComponents/DateRange"
import { nullize } from '../../utils/nullize'

import {FILTER_TYPE} from "../../constants"


export default function getFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const dataIndex = column.dataIndex
  const description = descriptions[dataIndex]

  if (!description)
    return undefined;
  switch (description.type) {
    case FILTER_TYPE.INPUT:
      return getInputFilterProps(column, descriptions, filters, setFilter, setFilterOption)
    case FILTER_TYPE.INPUT_NUMBER:
        return getInputNumberFilterProps(column, descriptions, filters, setFilter, setFilterOption, isValidInteger)
    case FILTER_TYPE.INPUT_OBJECT_ID:
      return getInputNumberFilterProps(column, descriptions, filters, setFilter, setFilterOption, isValidObjectID)
    case FILTER_TYPE.SELECT:
      if (description.mode !== 'multiple')
        return getRadioFilterProps(column, descriptions, filters, setFilter)
      return getSelectFilterProps(column, descriptions, filters, setFilter)
    case FILTER_TYPE.RANGE:
      return getRangeFilterProps(column, descriptions, filters, setFilter)
    case FILTER_TYPE.DATE_RANGE:
      return getDateRangeFilterProps(column, descriptions, filters, setFilter)
  }
  throw new Error(`unreachable: ${description.type}`)
}

function isValidObjectID(value) {
  // Object ID's must be postive integer values, so we verify that the string
  // contains only digits (and are tolerant of whitespace)
  let regex = /^\s*\d+\s*$/
  return regex.test(value)
}

function isValidInteger(value) {
  let numericValue = Number.parseInt(value)
  return !Number.isNaN(numericValue)
}


function getInputFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const filterKey = column.dataIndex;
  const description = descriptions[filterKey];
  const value = filters[filterKey]?.value;
  const options = filters[filterKey]?.options;

  return ({
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
        visible
      }
      return <InputFilter {...props}/>
    },
  })
}

function getInputNumberFilterProps(column, descriptions, filters, setFilter, setFilterOption, validationFunc) {
  const filterKey = column.dataIndex;
  const description = descriptions[filterKey];
  const value = filters[filterKey]?.value;

  return ({
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm, visible }) => {
      const props = {
        value, validationFunc, description, filterKey, setFilter, confirm, visible
      }
      return <InputNumberFilter {...props}/>
    }
  })
}

function getSelectFilterProps(column, descriptions, filters, setFilter) {
  const filterKey = column.dataIndex;
  const description = descriptions[filterKey];
  const value = filters[filterKey]?.value;
  const options = description.options || column.options || []
  const title = column.title

  return ({
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm, visible }) => {
      const props = {
        value,  title, options, filterKey, setFilter, confirm, visible
      }
      return <SelectFilter {...props}/>
    },
  })
}

function getRadioFilterProps(column, descriptions, filters, setFilter) {
  const filterKey = column.dataIndex;
  const description = descriptions[filterKey];
  const value = filters[filterKey]?.value
  const options = description.options || column.options || []

  return ({
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm, visible }) => {
      const props = {
        value, options, description, filterKey, setFilter, confirm, visible
      }

      return <RadioFilter {...props} />
    }
  })
}

function getRangeFilterProps(column, descriptions, filters, setFilter) {
  const filterKey = column.dataIndex;
  const description = descriptions[filterKey];
  const defaultMin = description.defaultMin ?? 0
  const value = filters[filterKey]?.value;
  const minValue = value?.min
  const maxValue = value?.max

  return ({
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm, visible }) => {
      const props = {
        minValue,
        defaultMin,
        maxValue,
        filterKey,
        setFilter,
        confirm,
        visible
      }

      return <RangeFilterComponent {...props} />
    },
  })
}

function getDateRangeFilterProps(column, descriptions, filters, setFilter) {
  const filterKey = column.dataIndex;
  const value = filters[filterKey]?.value
  const minValue = value && nullize(value.min) && moment(value.min)
  const maxValue = value && nullize(value.max) && moment(value.max)

  return ({
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm, visible }) => {
      const props = {
        minValue, maxValue, filterKey, setFilter, confirm, visible
      }
      return <DateRangeFilter {...props} />
    }
  })
}

function getFilterIcon(filtered) {
  return (
    <SearchOutlined
      style={{ color: filtered ? '#ff9800' : undefined }}
    />
  )
}

