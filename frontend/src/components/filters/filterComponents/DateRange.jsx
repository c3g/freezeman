import React from 'react'
import {Button, DatePicker, Input, Space } from 'antd'
import {SearchOutlined} from "@ant-design/icons"
import { DATE_FORMAT } from '../../../constants'
import { nullize } from '../../../utils/nullize'
import { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker
/**
 * 
 * @param {{
 * minValue?: Dayjs,
 * maxValue?: Dayjs,
 * filterKey: string,
 * setFilter: import('../../../models/paged_items').SetFilterFunc,
 * confirm: () => void,
 * visible: boolean,
 * description: import('../../../models/paged_items').FilterDescription,
 * style?: React.CSSProperties
 * }} props 
 * @returns 
 */
const DateRangeFilter = ({minValue, maxValue, filterKey, setFilter, confirm, description, style}) => {
    const onSearch = (values) => {
      setFilter(filterKey, values, description)
    }
  
    const onReset = () => {
      setFilter(filterKey, undefined, description)
    };
  
    const onKeyDown = (ev, confirm) => {
      ev.stopPropagation()
      if (ev.key === 'Escape') {
        confirm()
      }
    }
  
    return (
      <div style={style}>
        <Input.Group compact style={{ marginBottom: 8 }}>
          <RangePicker
            style={{ width: 300 }}
            format={DATE_FORMAT}
            allowEmpty={[true, true]}
            defaultValue={[null, null]}
            value={[minValue, maxValue]}
            onChange={dates => {
              const newDates = {}
              newDates.min = nullize(dates[0]) && dates[0].isValid && dates[0].toISOString().slice(0, 10) || undefined
              newDates.max = nullize(dates[1]) && dates[1].isValid && dates[1].toISOString().slice(0, 10) || undefined
              onSearch(newDates)
            }}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            onPressEnter={confirm}
          />
        </Input.Group>
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Done
          </Button>
          <Button onClick={() => onReset()} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    )
  }

  export default DateRangeFilter
  