import { SearchOutlined } from '@ant-design/icons'
import React from 'react'

import { TableColumnType } from 'antd'
import { FilterDescription, FilterDescriptionSet, FilterSet, FilterSetting, SetFilterFunc, SetFilterOptionFunc } from '../../models/paged_items'
import { getFilterComponent } from './getFilterComponent'


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
  filterSetting: FilterSetting | undefined, 
  setFilter: SetFilterFunc, 
  setFilterOption: SetFilterOptionFunc) {
	return {
		filterIcon: getFilterIcon(Boolean(filterSetting?.value)),
		filterDropdown: ({ confirm, visible }) => {
			return (
				<div style={{padding: '0.5em'}}>
					{getFilterComponent(
						description,
						filterSetting,
						setFilter,
						setFilterOption,
						confirm,
						visible
					)}
				</div>
		)},
	}
  }

  function getFilterIcon(filtered) {
	return <SearchOutlined style={{ color: filtered ? '#ff9800' : undefined }} />
}
