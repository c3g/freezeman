import React from "react";
import {Input, InputNumber} from "antd";
import FilterLabel from "./FilterLabel"
import * as style from "./style"


const FilterRange = ({
  item,
  value = [null, null],
  onChange,
}) => {

  return (
    <div style={style.container}>
      <FilterLabel>{item.label}</FilterLabel>

      <Input.Group style={style.element} compact>
        <InputNumber
          size='small'
          placeholder='From'
          min={0}
          style={{ width: 50 }}
          value={value[0]}
          onChange={newMin => onChange(item, [nullize(newMin), value[1]])}
        />
        <InputNumber
          size='small'
          placeholder='To'
          min={0}
          style={{ width: 50 }}
          value={value[1]}
          onChange={newMax => onChange(item, [value[0], nullize(newMax)])}
        />
      </Input.Group>
    </div>
  );
};

function nullize(v) {
  if (v === '')
    return null
  return v
}

export default FilterRange;
