import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
import {filterObjectWithKeys} from "../../utils/filterObjectWithKeys"
import {SAMPLE_FILTERS_RANGE, SAMPLE_FILTERS_SELECT} from "../../constants";


const mapStateToProps = state => ({
  filters: state.samples.filters,
});

const actionCreators = {setFilter, list};

const SamplesFilters = ({
  filters,
  setFilter,
  list,
  }) => {
  const onChangeFilter = (name, serializedValue) => {
    setFilter(name, serializedValue)
    list()
  }

  return <>
    {
      SAMPLE_FILTERS_SELECT.map((item, index) =>
        <FilterSelect
          type={item.key}
          name={item.name}
          value={filters[item.key]}
          options={item.options}
          mode={item.mode}
          placeholder={item.placeholder}
          onChange={onChangeFilter}
        />
      )
    }
    {
      SAMPLE_FILTERS_RANGE.map((item, i) =>
        <FilterRange
          name={item.name}
          min={item.min}
          max={item.max}
          onChange={onChangeFilter}
          filter={filterObjectWithKeys(item["min"], item["max"])}
        />
      )
    }
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);