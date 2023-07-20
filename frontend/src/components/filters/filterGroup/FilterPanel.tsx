import React, { useCallback } from 'react'
import { Collapse } from 'antd'

import FilterGroup from './FilterGroup'
import { FilterDescription, FilterOptions, FilterSet, FilterSetting, FilterValue, SetFilterFunc, SetFilterOptionFunc } from '../../../models/paged_items'
import FilterContainer from './FilterContainer'
import { getFilterPropsForDescription } from '../../shared/WorkflowSamplesTable/getFilterPropsTS'
import FilterLabel from './FilterLabel'
import { FILTER_TYPE } from '../../../constants'
import InputFilter from '../FilterProps/InputFilter'

// TODO: Clean up the setFilter function definition and define this in one place.
type SetFilterCallback = (value: FilterValue, description: FilterDescription) => void
type SetFilterOptionCallback = (description: FilterDescription, options: FilterOptions) => void

interface FilterPanelProps {
	descriptions: FilterDescription[]
	setFilter: SetFilterCallback
	setFilterOption: SetFilterOptionCallback
	filters: FilterSet
}

function useLegacySetFilterCallback(setFilter: SetFilterCallback) {
	return useCallback(
		(filterKey: string, value: FilterValue, description: FilterDescription) => {
			setFilter(value, description)
		},
		[setFilter]
	)
}

function useLegacySetFilterOptionCallback(setFilterOption: SetFilterOptionCallback) {
	return useCallback(
		(filterKey: string, propertyName: string, value: boolean, description: FilterDescription) => {
			setFilterOption(description, { propertyName: value })
		},
		[setFilterOption]
	)
}

const FilterPanel = ({ descriptions, filters, setFilter, setFilterOption }: FilterPanelProps) => {
	// const onChangeFilter = useCallback((description: FilterDescription, value: FilterValue) => {
	// 	setFilter(value, description)
	// }, [setFilter])

	const legacySetFilter = useLegacySetFilterCallback(setFilter)
	const legacySetFilterOption = useLegacySetFilterOptionCallback(setFilterOption)


	function createFilterComponent(
		description: FilterDescription
	) {
		const filterSetting: FilterSetting | undefined = filters[description.key]
		switch(description.type) {
			case FILTER_TYPE.INPUT: {
				return <InputFilter 
						value={filterSetting?.value} 
						options={filterSetting?.options}
						description={description}
						filterKey={description.key}
						setFilter={legacySetFilter}
						setFilterOption={legacySetFilterOption}
						confirm={() => true}
						visible={true}
					/>
			}
			default: return null
		}
	}

	function createFilterContainer(description: FilterDescription) {
		const filterComponent = createFilterComponent(description)
		if (filterComponent) {
			return (
				<FilterContainer key={`FILTER_GROUP:${description.key}`} label={description.label} width={description.width}>
					{filterComponent}
				</FilterContainer>
			)
		}
		return null
	}

	return (
		<div className="FiltersPanel">
			<Collapse defaultActiveKey={[]} ghost collapsible={'header'}>
				<Collapse.Panel header="Show advanced filters" key={'detached-filters'}>
					{descriptions.map((description) => {
						return createFilterContainer(description)
					})}
				</Collapse.Panel>
			</Collapse>
		</div>
	)
}

export default FilterPanel
