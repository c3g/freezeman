import React from "react";
import {Radio, Select} from "antd";

import FilterLabel from "./FilterLabel"
import * as style from "./style"

const { Option } = Select;

const EMPTY_VALUE = '__FILTER_SELECT_EMPTY_VALUE__'

const FilterSelect = ({
  item,
  value,
  options,
  onChange,
}) => {

  let handleChange
  let element

  if (item.mode !== 'multiple') {
    handleChange = ev => {
      const value = typeof ev === 'string' ? ev : ev.target.value
      onChange(item, value === EMPTY_VALUE ? null : [value])
    }
    element =
      <Radio.Group size='small' value={value ? value[0] : EMPTY_VALUE} onChange={handleChange}>
        <Radio.Button key={EMPTY_VALUE} value={EMPTY_VALUE}>
          {item.placeholder}
        </Radio.Button>
        {
          options.map(item =>
            <Radio.Button key={item.value} value={item.value}>
              {item.label}
            </Radio.Button>
          )
        }
      </Radio.Group>
  }
  else {
    handleChange = value => {
      onChange(item, value === EMPTY_VALUE ? null : value)
    }
    element =
      <Select
        size='small' 
        style={{ width: 200 }}
        mode={item.mode}
        placeholder={item.placeholder}
        value={value}
        onChange={handleChange}
      >
        {
          options.map(item =>
            <Option key={item.value} value={item.value}>{item.label}</Option>
          )
        }
      </Select>
  }

  return (
    <div style={style.container}>
      <FilterLabel>{item.label}</FilterLabel>
      <div style={style.element}>
        {element}
      </div>
    </div>
  );
};

export default FilterSelect;
