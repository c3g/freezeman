import React from "react";
import {connect} from "react-redux";
import {filter as filterObject} from "rambda";
import {Collapse} from "antd";

import {setFilter} from "../../modules/projects/actions";
import FilterGroup from "../filters/FilterGroup";
import {PROJECT_FILTERS} from "../filters/descriptions";

const mapStateToProps = state => ({
  filters: state.projects.filters,
});

const actionCreators = {setFilter};

const ProjectsFilters = ({
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
            descriptions={PROJECT_FILTERS}
            values={filters}
            onChangeFilter={onChangeFilter}
          />
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}

export default connect(mapStateToProps, actionCreators)(ProjectsFilters);
