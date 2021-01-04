import React, {useCallback} from "react";
import {connect} from "react-redux";
import {debounce} from "debounce";
import {Button} from "antd";

import {list, setFilter, clearFilters} from "../../modules/containers/actions";
import FilterGroup from "../filters/FilterGroup";
import {CONTAINER_FILTERS} from "../filters/descriptions";


const mapStateToProps = state => ({
  filters: state.containers.filters,
});

const actionCreators = {setFilter, clearFilters, list};

const ContainersFilters = ({
  filters,
  setFilter,
  clearFilters,
  list,
}) => {
  const listDebounced = useCallback(debounce(list, 250), [list])
  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    listDebounced()
  }
  const onClearFilters = () => {
    clearFilters()
    listDebounced()
  }

  return (
    <div>
      <FilterGroup
        descriptions={CONTAINER_FILTERS}
        values={filters}
        onChangeFilter={onChangeFilter}
      />
      <Button onClick={onClearFilters}>
        Clear
      </Button>
    </div>
  );
}

export default connect(mapStateToProps, actionCreators)(ContainersFilters);
