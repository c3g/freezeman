import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/containers/actions";
import FilterSelect from "../filters/FilterSelect";
import {CONTAINER_FILTERS} from "../../constants"


const mapStateToProps = state => ({
  containersKinds: state.containerKinds.items,
  filters: state.containers.filters,
});

const actionCreators = {setFilter, list};

const ContainersFilters = ({
  containersKinds,
  filters,
  setFilter,
  list,
}) => {

  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    list()
  }

  const item = CONTAINER_FILTERS.kind__in

  return <>
    <FilterSelect
      item={item}
      options={containersKinds.map(x => ({ label: x.id, value: x.id }))}
      value={filters[item.key]}
      onChange={onChangeFilter}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(ContainersFilters);
