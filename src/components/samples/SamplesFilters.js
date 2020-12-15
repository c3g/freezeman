import React, {useEffect} from "react";
import {connect} from "react-redux";
import {list, listBiospecimenTypes, setFilter} from "../../modules/samples/actions";
import FilterSelect from "../filters/FilterSelect";
import FilterRange from "../filters/FilterRange";
import filterDictionaryByKeys from "../../utils/filterDictionaryByKeys"


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
    <FilterRange
      type="concentration"
      name="concentration"
      onChange={onChangeFilter}
      filter={filterDictionaryByKeys(["concentration__gte", "concentration__lte"])}
    />
    <FilterRange
      type="volume_used"
      name="volume used"
      onChange={onChangeFilter}
      filter={filterDictionaryByKeys(["volume_used__gte", "volume_used__lte"])}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);