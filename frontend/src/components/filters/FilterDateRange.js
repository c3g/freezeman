import React from "react";
import {DatePicker} from "antd";
import FilterLabel from "./FilterLabel"
import * as style from "./style"

DATE_FORMAT = "YYYY-MM-DD"

const FilterDateRange = ({
  item,
}) => {

  return (
    <div style={style.container}>
      <FilterLabel>{item.label}</FilterLabel>
      <Input.Group style={style.element} compact>
        <DatePicker format={DATE_FORMAT}/>
      </Input.Group>
    </div>
  );
};

function nullize(v) {
  if (v === '')
    return null
  return v
}

export default FilterDateRange;
