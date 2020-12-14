import React from "react";
import {list, setFilter} from "../../modules/containers/actions";
import FilterSelect from "../filters/FilterSelect";
import {connect} from "react-redux";

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

  const onChangeFilter = (name, value) => {
    setFilter(name, value)
    list()
  }

  return <>
    <FilterSelect
      filterType="kind"
      filterTypeName="kind"
      options={containersKinds.map(x => x.id)}
      multipleOptions={false}
      defaultValue=''
      defaultValueName='All'
      onChange={onChangeFilter}
      filters={filters}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(ContainersFilters);