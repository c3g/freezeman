import React, {useState} from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import {reduceNestedObjectByKeyValue} from "../../utils/reduceNestedObjectsByKeyValue";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import {Tabs} from 'antd'

const { TabPane } = Tabs;

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

  return <Tabs type="card">
    <TabPane tab="Basic Search" key="1" style={{textAlign: 'center'}}>
      <FilterGroup
        descriptions={reduceNestedObjectByKeyValue(SAMPLE_FILTERS,"displayByDefault", false)}
        values={filters}
        onChangeFilter={onChangeFilter}
      />
    </TabPane>
    <TabPane tab="Advanced Search" key="2" style={{textAlign: 'center'}}>
      <FilterGroup
        descriptions={reduceNestedObjectByKeyValue(SAMPLE_FILTERS,"displayByDefault", true)}
        values={filters}
        onChangeFilter={onChangeFilter}
      />
    </TabPane>
  </Tabs>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
