import React, {useState} from "react";
import {connect} from "react-redux";
import {list, setFilter, clearFilters} from "../../modules/samples/actions";
import {reduceNestedObjectByKeyValue} from "../../utils/reduceNestedObjectsByKeyValue";
import FilterGroup from "../filters/FilterGroup";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import {Button} from "antd";
import {CaretRightOutlined, CaretDownOutlined} from "@ant-design/icons";

const mapStateToProps = state => ({
  filters: state.samples.filters,
});

const actionCreators = {setFilter, clearFilters, list};

const SamplesFilters = ({
  filters,
  setFilter,
  clearFilters,
  list,
}) => {
  const [showDetailedFilters, setShowDetailedFilters] = useState(false);

  const onChangeFilter = (filter, value) => {
    setFilter(filter.key, value)
    setTimeout(() => {list()}, 500)
  }

  return <div style={{marginBottom: '25px', padding: '20px'}}>
    <div>
      <FilterGroup
        descriptions={reduceNestedObjectByKeyValue(SAMPLE_FILTERS,"displayByDefault", false)}
        values={filters}
        onChangeFilter={onChangeFilter}
      />
      <span onClick={clearFilters} style={{position: 'relative', left: '10px', top: '25px'}}>
        <Button type="dashed" style={{color: 'grey'}}>Reset</Button>
      </span>
    </div>
    <div style={{paddingBottom: '15px'}}>
      <span onClick={() => setShowDetailedFilters(!showDetailedFilters)}>
      {
        showDetailedFilters ? <CaretDownOutlined/> : <CaretRightOutlined/>
      }
      <a> Advanced options </a>
      </span>
    </div>
    <div>
      {
        showDetailedFilters ?
          <FilterGroup
            descriptions={reduceNestedObjectByKeyValue(SAMPLE_FILTERS,"displayByDefault", true)}
            values={filters}
            onChangeFilter={onChangeFilter}
          />
          :
          ''
      }
    </div>

  </div>;
}

export default connect(mapStateToProps, actionCreators)(SamplesFilters);
