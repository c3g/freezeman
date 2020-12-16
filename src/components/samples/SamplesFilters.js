import React from "react";
import {connect} from "react-redux";
import {list, setFilter} from "../../modules/samples/actions";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
import filterDictionaryByKeys from "../../utils/filterDictionaryByKeys"
import {sampleFiltersConstants} from "../../constants";


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
      sampleFiltersConstants['select'].map(function(item, i){
        return <FilterSelect
          type={item["key"]}
          name={item["name"]}
          value={filters[item["key"]]}
          options={item["options"]}
          mode={item["mode"]}
          placeholder={item["placeholder"]}
          onChange={onChangeFilter}
        />
      })
    }

    {
      sampleFiltersConstants['range'].map(function(item, i){
        return <FilterRange
          type={item["key"]}
          name={item["name"]}
          min={item["min"]}
          max={item["max"]}
          onChange={onChangeFilter}
          filter={filterDictionaryByKeys([item["min"], item["max"]])}
        />
      })

    }



  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);