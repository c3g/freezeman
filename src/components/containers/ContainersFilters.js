import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/containers/actions";
import FilterGroup from "../filters/FilterGroup";
import FilterSelect from "../filters/FilterSelect";
import FilterInput from "../filters/FilterInput";
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
    setTimeout(() => {list()}, 500)
  }

  const containerBarcodeItem = CONTAINER_FILTERS.barcode__icontains
  const containerKindsItem = CONTAINER_FILTERS.kind__in

  return <FilterGroup>
    <FilterInput
      key={containerBarcodeItem.key}
      item={containerBarcodeItem}
      value={filters[containerBarcodeItem.key]}
      onChange={onChangeFilter}
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
