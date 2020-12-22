import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../filters/descriptions";


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

  return <FilterGroup
    descriptions={SAMPLE_FILTERS}
    values={filters}
    onChangeFilter={onChangeFilter}
  />;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
