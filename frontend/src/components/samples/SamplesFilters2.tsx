import React from 'react'
import { connect } from 'react-redux'
import { filter as filterObject } from 'rambda'
import { Collapse } from 'antd'

import { setFilter } from '../../modules/samples/actions'
import FilterGroup from '../filters/filterGroup/FilterGroup'
import { SAMPLE_FILTERS } from '../filters/descriptions'
import { FilterSet } from '../../models/paged_items'
import { SetFilterCallback } from '../pagedItemsTable/PagedItemsTable'


interface SamplesFiltersProps {
	filters: FilterSet
	setFilter: SetFilterCallback
}

const SamplesFilters2 = ({ filters, setFilter, ...rest }: SamplesFiltersProps) => {

	const onChangeFilter = (filter, value) => {
		setFilter(filter.key, value)
	}

	return (
		<div className="SamplesFilters" {...rest}>
			<Collapse defaultActiveKey={[]} ghost>
				<Collapse.Panel key="SamplesFilters" header="Show advanced filters">
					<FilterGroup
						descriptions={filterObject((f) => f.detached, SAMPLE_FILTERS)}
						values={filters}
						onChangeFilter={onChangeFilter}
					/>
				</Collapse.Panel>
			</Collapse>
		</div>
	)
}

export default SamplesFilters2
