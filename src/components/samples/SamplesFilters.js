import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import FilterGroup from "../filters/FilterGroup";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
import {FILTER_TYPE, SAMPLE_FILTERS} from "../../constants";


const mapStateToProps = state => ({
  filters: state.samples.filters,
});

const actionCreators = {setFilter, list};

const SamplesFilters = ({
  filters,
  setFilter,
  list,
}) => {
  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    list()
  }

  return <FilterGroup>
    {
      Object.values(SAMPLE_FILTERS).map(item =>
        item.type === FILTER_TYPE.SELECT ?
          <FilterSelect
            key={item.key}
            item={item}
            value={filters[item.key]}
            onChange={onChangeFilter}
          />
          :
          <FilterRange
            key={item.key}
            item={item}
            value={filters[item.key]}
            onChange={onChangeFilter}
          />
      )
    }
  </FilterGroup>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
