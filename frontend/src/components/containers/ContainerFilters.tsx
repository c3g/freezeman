import React from "react";
import {filter as filterObject} from "rambda";
import {Collapse} from "antd";

import {setFilter} from "../../modules/containers/actions";
import FilterGroup from "../filters/filterGroup/FilterGroup";
import {CONTAINER_FILTERS} from "../filters/descriptions";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { FilterDescription, FilterSetting, FilterValue } from "../../models/paged_items";

type ContainerFiltersProps = Pick<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, 'style'>

const ContainerFilters = (rest: ContainerFiltersProps) => {
  const filters = useAppSelector((state) => state.containers.filters as FilterSetting[])
  const dispatch = useAppDispatch()

  const onChangeFilter = (filter: FilterDescription, value: FilterValue) => {
    dispatch(setFilter(filter.key, value))
  }

  return (
    <div className='SamplesFilters' {...rest}>
      <Collapse defaultActiveKey={[]} ghost>
        <Collapse.Panel
          header='Show advanced filters'
          key={0}
        >
          <FilterGroup
            descriptions={filterObject(f => f.key === CONTAINER_FILTERS.comment.key, CONTAINER_FILTERS)}
            values={filters}
            onChangeFilter={onChangeFilter}
          />
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}

export default ContainerFilters
