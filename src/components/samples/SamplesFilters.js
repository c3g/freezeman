import React, {useEffect} from "react";
import {connect} from "react-redux";
import {list, listBiospecimenTypes, setFilter} from "../../modules/samples/actions";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
import filterDictionaryByKeys from "../../utils/filterDictionaryByKeys"
import {sampleFiltersConstants} from "../../constants";
import {Select} from "antd";


const mapStateToProps = state => ({
  samplesBiospecimenTypes: state.sampleBiospecimenTypes.items,
  filters: state.samples.filters,
});

const actionCreators = {setFilter, list, listBiospecimenTypes};

const SamplesFilters = ({
  samplesBiospecimenTypes,
  filters,
  setFilter,
  list,
  listBiospecimenTypes,
  }) => {
  useEffect(() => {
    listBiospecimenTypes();
  }, []);

  const onChangeFilter = (name, serializedValue) => {
    setFilter(name, serializedValue)
    list()
  }

  return <>
    <FilterSelect
      type="biospecimen_type__in"
      name="biospecimen type"
      value={filters["biospecimen_type__in"]}
      options={samplesBiospecimenTypes}
      mode="multiple"
      placeholder="All"
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterSelect
      type="depleted"
      name="depleted"
      value={filters["depleted"]}
      options={['true', 'false']}
      mode=""
      placeholder="All"
      onChange={onChangeFilter}
    />
    <FilterSelect
      type="individual__sex__in"
      name="individual's sex"
      value={filters["individual__sex__in"]}
      options={['F', 'M', 'Unknown']}
      mode="multiple"
      placeholder="All"
      onChange={onChangeFilter}
    />
    <span>

      {
        sampleFiltersConstants['range'].map(function(item, i){
          console.log(item);
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
    </span>


  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);