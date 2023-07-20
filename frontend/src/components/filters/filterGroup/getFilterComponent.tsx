import React from 'react'
import { FILTER_TYPE } from "../../../constants"
import { FilterDescription, FilterSet, FilterSetting, SetFilterFunc, SetFilterOptionFunc } from "../../../models/paged_items"
import InputFilter from "../FilterProps/InputFilter"
import { InputNumber } from 'antd'
import InputNumberFilter from '../FilterProps/InputNumberFilter'

export function getFilterComponent(
	description: FilterDescription,
	filters: FilterSet,
	setFilter: SetFilterFunc,
	setFilterOption: SetFilterOptionFunc
) {	
	const filterSetting: FilterSetting | undefined = filters[description.key]
	switch(description.type) {
		case FILTER_TYPE.INPUT: {
			return <InputFilter 
					value={filterSetting?.value} 
					options={filterSetting?.options}
					description={description}
					filterKey={description.key}
					setFilter={setFilter}
					setFilterOption={setFilterOption}
					confirm={() => true}
					visible={true}
				/>
		}
		case FILTER_TYPE.INPUT_NUMBER: {
			return <InputNumberFilter
					value={filterSetting?.value}
					still trying to figure out how to use the same component in column header and in filter panel
				/>
			break
		}
		default: return null
	}
}