import React, {useState} from "react";
import {Radio, Select, Input} from "antd";

import FilterLabel from "./FilterLabel"
import FilterInput from "./FilterLabel"
import * as style from "./style"

const { Option } = Select;

const EMPTY_VALUE = '__FILTER_SELECT_EMPTY_VALUE__'

const FilterProperty = ({
  item,
  name,
  propertyValue,
  options,
  onChange,
}) => {
  const [propertyName, setPropertyName] = useState([]);

  //Property Name
  const handleNameChange = name => {
    setPropertyName(name)
  }

  //Property Value, which applies the filter
  const handleValueChange = ev => {
    propertyValue = typeof ev === 'string' ? ev : ev.target.value
    onChange(item, propertyValue, options = { propertyName: propertyName})
  }

  const element =
    <Select
      size='small'
      style={{ width: 200 }}
      mode={item.mode}
      placeholder={item.placeholder}
      value={propertyName}
      onChange={handleNameChange}
    >
      {
        options.map(item =>
          <Option
            key={item.value}
            value={item.value}>
              {item.label}
          </Option>
        )
      }
    </Select>

  return (
    <div style={style.containerPropertyValue}>
      <FilterLabel>{item.label}</FilterLabel>
      <div style={style.containerPropertyName}>
        {element}
      </div>
      <div style={{float: 'left'}}>
      <FilterLabel> Property Value </FilterLabel>

      <Input.Group style={style.element} compact>
        <Input
          size='small'
          value={propertyValue}
          onChange={handleValueChange}
        />
      </Input.Group>
      </div>
    </div>
  );
};

export default FilterProperty;
