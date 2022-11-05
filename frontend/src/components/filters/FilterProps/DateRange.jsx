import React, { useEffect, useRef } from 'react'
import {Button, DatePicker, Input, Space } from 'antd'
import {SearchOutlined} from "@ant-design/icons"
import { DATE_FORMAT } from '../../../constants'

const { RangePicker } = DatePicker

const DateRangeFilter = ({minValue, maxValue, dataIndex, setFilter, confirm, visible}) => {

    const dateRangeRef = useRef()

    const onSearch = (values) => {
      setFilter(dataIndex, values)
    }
  
    const onReset = () => {
      setFilter(dataIndex, undefined)
    };
  
    const onKeyDown = (ev, confirm) => {
      if (ev.key === 'Escape')
        confirm()
    }

    useEffect(() => {
        if (visible) {
          setTimeout(() => {dateRangeRef.current?.focus()}, 100)
        }
      }, [visible])
  
    return (
      <div style={{ padding: 8 }}>
        <Input.Group compact style={{ marginBottom: 8 }}>
          <RangePicker
            ref = {dateRangeRef}
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

  function nullize(v) {
    if (v === '')
      return null
    return v
  }

  export default DateRangeFilter
  