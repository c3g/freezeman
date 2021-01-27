import React from "react";
import {connect} from "react-redux";
import {filter as filterObject} from "rambda";
import {Collapse} from "antd";
import "antd/es/button/style/css";
import "antd/es/collapse/style/css";

import {setFilter} from "../../modules/samples/actions";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../filters/descriptions";

const mapStateToProps = state => ({
  filters: state.samples.filters,
});

const actionCreators = {setFilter};

const SamplesFilters = ({
  filters,
  setFilter,
  ...rest
}) => {

  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
  }

  return (
    <div className='SamplesFilters' {...rest}>
      <Collapse defaultActiveKey={[]} ghost>
        <Collapse.Panel
          header='Show advanced filters'
        >
          <FilterGroup
            descriptions={filterObject(f => f.detached, SAMPLE_FILTERS)}
            values={filters}
            onChangeFilter={onChangeFilter}
          />
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
