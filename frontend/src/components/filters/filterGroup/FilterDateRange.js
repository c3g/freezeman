import React from "react";
import {DatePicker} from "antd";
import FilterLabel from "./FilterLabel"
import * as style from "../style"
import {DATE_FORMAT} from "../../../constants"
import { nullize } from '../../../utils/nullize'

const { RangePicker } = DatePicker;

const FilterDateRange = ({
  item,
  value = [null, null],
  onChange,
}) => {

  return (
    <div style={style.container}>
      <FilterLabel>{item.label}</FilterLabel>
      <Input.Group style={style.element} compact>
        <RangePicker
          style={{ width: 300 }}
          format={DATE_FORMAT}
          allowEmpty={[true, true]}
          defaultValue={[null, null]}
          value={value}
          onChange={dates => {
            const newDates = {}
            newDates.min = nullize(dates[0]) && dates[0].isValid && dates[0].toISOString().slice(0, 10) || undefined
            newDates.max = nullize(dates[1]) && dates[1].isValid && dates[1].toISOString().slice(0, 10) || undefined
            onChange(item, newDates)
          }}
        />
      </Input.Group>
    </div>
  );
};

export default FilterDateRange;
