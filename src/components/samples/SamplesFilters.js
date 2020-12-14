import React, {useEffect} from "react";
import {list, listBiospecimenTypes, setFilter, clearFilters} from "../../modules/samples/actions";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
import {connect} from "react-redux";

const mapStateToProps = state => ({
  samplesBiospecimenTypes: state.sampleBiospecimenTypes.items,
  filters: state.samples.filters,
});

const actionCreators = {setFilter, clearFilters, list, listBiospecimenTypes};

const SamplesFilters = ({
  samplesBiospecimenTypes,
  filters,
  setFilter,
  clearFilters,
  list,
  listBiospecimenTypes,
  }) => {
  useEffect(() => {
    listBiospecimenTypes();
  }, []);

  const onChangeFilter = (name, value) => {
    const val = Array.isArray(value) ? value.join(",") : value
    val == "" ? clearFilters() : setFilter(name, val)
    list()
  }

  return <>
    <FilterSelect
      filterType="biospecimen_type__in"
      filterTypeName="biospecimen type"
      options={samplesBiospecimenTypes}
      mode="multiple"
      placeholder="All"
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterSelect
      filterType="depleted__in"
      filterTypeName="depleted"
      options={['true', 'false']}
      mode=""
      placeholder="All"
      onChange={onChangeFilter}
      filters={filters}
    />
    <FilterSelect
      filterType="individual__sex__in"
      filterTypeName="individual's sex"
      options={['F', 'M', 'Unknown']}
      mode="multiple"
      placeholder="All"
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