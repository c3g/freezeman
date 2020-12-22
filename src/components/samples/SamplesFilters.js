import React, {useState} from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import { DownOutlined } from "@ant-design/icons";

const mapStateToProps = state => ({
  filters: state.samples.filters,
});

const actionCreators = {setFilter, list};

const SamplesFilters = ({
  filters,
  setFilter,
  list,
}) => {
  const [showDetailedFilters, setShowDetailedFilters] = useState(false);

  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    setTimeout(() => {list()}, 500)
  }

  return <div>
    <div onClick={() => setShowDetailedFilters(!showDetailedFilters)}> <DownOutlined /> </div>
    {
      showDetailedFilters
        ?     <FilterGroup
          descriptions={SAMPLE_FILTERS}
          values={filters}
          onChangeFilter={onChangeFilter}
        />
        : ''
    }
  </div>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
