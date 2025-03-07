import { Collapse } from 'antd'
import React from 'react'

import { FilterDescription, FilterSet, FilterSetting } from '../../../models/paged_items'
import { getFilterComponent } from '../getFilterComponent'
import FilterContainer from './FilterContainer'
import { PagedItemsActionsCallbacks } from '../../pagedItemsTable/PagedItemsTable'

// TODO: Clean up the setFilter function definition and define this in one place.
type SetFilterCallback = PagedItemsActionsCallbacks['setFilterCallback']
type SetFilterOptionCallback = PagedItemsActionsCallbacks['setFilterOptionsCallback']

export interface FilterPanelProps {
	descriptions: FilterDescription[]
	setFilter: SetFilterCallback
	setFilterOption: SetFilterOptionCallback
	filters: FilterSet
  withCollapsible?: boolean
}

/**
 * FilterPanel displays a set of filters used in the 'advanced filters' sections of our tables.
 * These are filters that are not associated with any columns in the table.
 * @param props
 * @returns FilterPanel
 */
const FilterPanel = ({ descriptions, filters, setFilter, setFilterOption, withCollapsible = true}: FilterPanelProps) => {

	function createFilterContainer(description: FilterDescription) {
		const filterSetting: FilterSetting | undefined = filters[description.key]
		const filterComponent = getFilterComponent(description, filterSetting, setFilter, setFilterOption)
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
