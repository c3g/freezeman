import React from "react";
import {list, setFilter, clearFilters} from "../../modules/containers/actions";
import FilterSelect from "../filters/FilterSelect";
import {connect} from "react-redux";

const mapStateToProps = state => ({
  containersKinds: state.containerKinds.items,
  filters: state.containers.filters,
});

const actionCreators = {setFilter, clearFilters, list};

const ContainersFilters = ({
  containersKinds,
  filters,
  setFilter,
  clearFilters,
  list,
}) => {

  const onChangeFilter = (name, value) => {
    const val = Array.isArray(value) ? value.join(",") : value
    val == "" ? clearFilters() : setFilter(name, val)
    list()
  }

  return <>
    <FilterSelect
      filterType="kind__in"
      filterTypeName="kind"
      options={containersKinds.map(x => x.id)}
      mode="multiple"
      placeholder="All"
      onChange={onChangeFilter}
      filters={filters}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(ContainersFilters);