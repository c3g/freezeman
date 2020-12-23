import React from "react";
import {connect} from "react-redux";
import FilterSelect from "./FilterSelect";
import FilterRange from "./FilterRange";
import FilterInput from "./FilterInput";
import {FILTER_TYPE} from "../../constants";

const style = {}

const mapStateToProps = state => ({
  containersKinds: state.containerKinds.items,
});

const actionCreators = {};

const FilterGroup = ({
  descriptions,
  values,
  onChangeFilter,
  containersKinds,
}) => {
  const optionsForSelect = (item) => {
    switch(item.key){
      case "kind__in":
        return containersKinds.map(x => ({ label: x.id, value: x.id }))
        break;
      default:
        return item.options || []
        break;
    }
  }

  return (
    <span style={style}>
      {
        Object.values(descriptions).map(item => {
          switch(item.type){
            case FILTER_TYPE.SELECT:
              return (
                <FilterSelect
                  key={item.key}
                  item={item}
                  value={values[item.key]}
                  options={optionsForSelect(item)}
                  onChange={onChangeFilter}
                />
              );
            case FILTER_TYPE.INPUT:
              return (
                <FilterInput
                  key={item.key}
                  item={item}
                  value={values[item.key]}
                  width={item.width}
                  onChange={onChangeFilter}
                />
              );
            case FILTER_TYPE.RANGE:
              return (
                <FilterRange
                  key={item.key}
                  item={item}
                  value={values[item.key]}
                  onChange={onChangeFilter}
                />
              );
            default:
              throw new Error('Filter type not handled');
          }
        })
      }
    </span>
  );
};

export default connect(mapStateToProps, actionCreators)(FilterGroup);