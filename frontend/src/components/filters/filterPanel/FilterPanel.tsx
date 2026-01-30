import { Collapse } from 'antd'
import React, { useCallback } from 'react'

import { FilterDescription, FilterOptions, FilterSet, FilterSetting, FilterValue } from '../../../models/paged_items'
import { getFilterComponent } from '../getFilterComponent'
import FilterContainer from './FilterContainer'

// TODO: Clean up the setFilter function definition and define this in one place.
export type SetFilterCallback = (value: FilterValue, description: FilterDescription) => void
export type SetFilterOptionCallback = (description: FilterDescription, options: FilterOptions) => void

interface FilterPanelProps {
	descriptions: FilterDescription[]
	setFilter: SetFilterCallback
	setFilterOption: SetFilterOptionCallback
	filters: FilterSet
  withCollapsible?: boolean
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
			setFilterOption(description, { [propertyName]: value })
		},
		[setFilterOption]
	)
}
/**
 * FilterPanel displays a set of filters used in the 'advanced filters' sections of our tables.
 * These are filters that are not associated with any columns in the table.
 * @param props
 * @returns FilterPanel
 */
const FilterPanel = ({ descriptions, filters, setFilter, setFilterOption, withCollapsible = true}: FilterPanelProps) => {

	// TODO is this necessary anymore?
	const legacySetFilter = useLegacySetFilterCallback(setFilter)
	const legacySetFilterOption = useLegacySetFilterOptionCallback(setFilterOption)

	function createFilterContainer(description: FilterDescription) {
		const filterSetting: FilterSetting | undefined = filters[description.key]
		const filterComponent = getFilterComponent(description, filterSetting, legacySetFilter, legacySetFilterOption)
		if (filterComponent) {
			return (
				<FilterContainer key={`FILTER_GROUP:${description.key}`} label={description.label}>
					{filterComponent}
				</FilterContainer>
			)
		}
		return null
	}

    if (withCollapsible) {
        return (
            <div className="FiltersPanel">
                <Collapse defaultActiveKey={[]} ghost collapsible={"header"} items={[{
                    key: 'detached-filters',
                    label: "Show advanced filters",
                    children: (
                        <div style={{
                            display: 'flex',
                            gap: '0.5em',
                            flexWrap: 'wrap',
                        }}>
                            {descriptions.map((description) => {
                                return createFilterContainer(description)
                            })}
                        </div>
                    )
                }]}>
                </Collapse>
            </div>
            )
    } else {
        return (
            <div className="FiltersPanel">
                <div style={{
                    display: 'flex',
                    gap: '0.5em',
                    flexWrap: 'wrap',
                    justifyContent:"flex-start"
                }}>
                    {descriptions.map((description) => {
                        return createFilterContainer(description)
                    })}
                </div>
            </div>
        )
    }
}

export default FilterPanel
