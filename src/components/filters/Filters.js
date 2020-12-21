import React from "react";
import FilterSelect from "./FilterSelect";
import FilterRange from "./FilterRange";
import FilterInput from "./FilterInput";
import {FILTER_TYPE} from "../../constants";


const Filters = ({
  filterObject,
  filters,
  onChangeFilter,
}) => {
  return (
    <span>
      {
        Object.values(filterObject).map(item => {
          switch(item.type){
            case FILTER_TYPE.SELECT:
              return (
                <FilterSelect
                  key={item.key}
                  item={item}
                  value={filters[item.key]}
                  onChange={onChangeFilter}
                />
              );
            case FILTER_TYPE.INPUT:
              return (
                <FilterInput
                  key={item.key}
                  item={item}
                  value={filters[item.key]}
                  width={item.width}
                  onChange={onChangeFilter}
                />
              );
            case FILTER_TYPE.RANGE:
              return (
                <FilterRange
                  key={item.key}
                  item={item}
                  value={filters[item.key]}
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

export default Filters;