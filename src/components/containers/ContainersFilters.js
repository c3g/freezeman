import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/containers/actions";
import FilterGroup from "../filters/FilterGroup";
import FilterSelect from "../filters/FilterSelect";
import Filters from "../filters/Filters";
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
  const containerKindsItem = CONTAINER_FILTERS.kind__in

  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    setTimeout(() => {list()}, 500)
  }

  // Container KINDS are retrieved from containerKinds state store.
  // It had to be separated here in order to keep the constants.js file independent from the store
  const containersFiltersWithoutKind = () => {
    let containersFiltersCopy = Object.assign({}, CONTAINER_FILTERS);
    delete containersFiltersCopy.kind__in;
    return containersFiltersCopy;
  }

  return <FilterGroup>
    <Filters
      filterObject={containersFiltersWithoutKind()}
      filters={filters}
      onChangeFilter={onChangeFilter}
    />
    <FilterSelect
      item={containerKindsItem}
      options={containersKinds.map(x => ({ label: x.id, value: x.id }))}
      value={filters[containerKindsItem.key]}
      onChange={onChangeFilter}
    />

  </FilterGroup>;

}

export default connect(mapStateToProps, actionCreators)(ContainersFilters);
