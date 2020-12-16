import React from "react";
import {InputNumber} from "antd";
import "antd/es/input-number/style/css";


const FilterRange = ({
  item,
  value = [null, null],
  onChange,
}) => {

  return (
    <div>
      <label>{item.label}</label>
      <InputNumber
        min={0}
        value={value[0]}
        onChange={newMin => onChange(item, [nullize(newMin), value[1]])}
      />
      {' to '}
      <InputNumber
        min={0}
        value={value[1]}
        onChange={newMax => onChange(item, [value[0], nullize(newMax)])}
      />
    </div>
  );
};

function nullize(v) {
  if (v === '')
    return null
  return v
}

export default FilterRange;
