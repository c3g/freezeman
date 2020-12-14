import React, {useEffect} from "react";
import {list, listBiospecimenTypes, setFilter} from "../../modules/samples/actions";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
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
  }

  return <>
    <FilterSelect
      filterType="biospecimen_type"
      filterTypeName="biospecimen type"
      options={samplesBiospecimenTypes}
      multipleOptions={false}
      defaultValue=''
      defaultValueName='All'
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterSelect
      filterType="depleted"
      filterTypeName="depleted"
      options={['true', 'false']}
      multipleOptions={false}
      defaultValue=''
      defaultValueName='Both'
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterSelect
      filterType="individual__sex"
      filterTypeName="individual's sex"
      options={['F', 'M', 'Unknown']}
      multipleOptions={false}
      defaultValue=''
      defaultValueName='All'
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterRange
      filterTypeMin="concentration__gte"
      filterTypeMax="concentration__lte"
      filterTypeName="concentration"
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterRange
      filterTypeMin="volume_used_gte"
      filterTypeMax="volume_used__lte"
      filterTypeName="volume used"
      onChange={onChangeFilter}
      filters={filters}
    />

  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);