import React, {useEffect} from "react";
import {list, listBiospecimenTypes, setFilter} from "../../modules/samples/actions";
import FilterSelect from "../FilterSelect";
import {connect} from "react-redux";

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

  const onChangeFilter = (name, value) => {
    setFilter(name, value)
    list()
    //TODO: put back value={filters[filterType]} in FilterSelect in select tag
  }

  return <>
    <FilterSelect
      filterType="biospecimen_type"
      options={samplesBiospecimenTypes}
      multipleOptions={false}
      defaultValue=''
      defaultValueName='All'
      onChange={onChangeFilter}
      filters={filters}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);