import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/containers/actions";
import FilterGroup from "../filters/FilterGroup";
import {CONTAINER_FILTERS} from "../filters/descriptions";


const mapStateToProps = state => ({
  filters: state.containers.filters,
});

const actionCreators = {setFilter, list};

const ContainersFilters = ({
  filters,
  setFilter,
  list,
}) => {
  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    setTimeout(() => {list()}, 500)
  }

  return <div style={{textAlign: 'center'}}>
    <FilterGroup
      descriptions={CONTAINER_FILTERS}
      values={filters}
      onChangeFilter={onChangeFilter}
    />
  </div>;

}

export default connect(mapStateToProps, actionCreators)(ContainersFilters);
