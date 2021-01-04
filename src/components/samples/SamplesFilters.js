import React, {useCallback} from "react";
import {connect} from "react-redux";
import {filter as filterObject} from "rambda";
import {debounce} from "debounce";
import {Button, Collapse} from "antd";
import "antd/es/button/style/css";
import "antd/es/collapse/style/css";

import {list, setFilter, clearFilters} from "../../modules/samples/actions";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../filters/descriptions";

const mapStateToProps = state => ({
  filters: state.samples.filters,
});

const actionCreators = {setFilter, clearFilters, list};

const SamplesFilters = ({
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
    <div className='SamplesFilters'>
      <div>
        <FilterGroup
          descriptions={filterObject(f => f.displayByDefault === true, SAMPLE_FILTERS)}
          values={filters}
          onChangeFilter={onChangeFilter}
        />
        <Button onClick={onClearFilters}>Clear</Button>
      </div>
      <Collapse defaultActiveKey={[]} ghost>
        <Collapse.Panel
          header='Show advanced filters'
        >
          <FilterGroup
            descriptions={filterObject(f => f.displayByDefault === false, SAMPLE_FILTERS)}
            values={filters}
            onChangeFilter={onChangeFilter}
          />
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
