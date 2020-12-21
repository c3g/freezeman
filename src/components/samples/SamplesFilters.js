import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import Filters from "../filters/Filters";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../../constants";


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
    setTimeout(() => {list()}, 500)
  }

  return <FilterGroup>
    <Filters
      filterObject={SAMPLE_FILTERS}
      filters={filters}
      onChangeFilter={onChangeFilter}
    />
  </FilterGroup>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
