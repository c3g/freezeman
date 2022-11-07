import React, { useEffect, useRef } from 'react'
import {Button, Input, InputNumber, Space } from 'antd'
import {SearchOutlined} from "@ant-design/icons"
import { nullize } from '../../../utils/nullize'

const RangeFilterComponent = ({minValue, defaultMin, maxValue, dataIndex, setFilter, confirm, visible}) => {

    const inputRef = useRef()

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
          setTimeout(() => {inputRef.current?.focus()}, 100)
        }
      }, [visible])
  
    return (
      <div style={{ padding: 8 }}>
          <Input.Group compact style={{ marginBottom: 8 }}>
            <InputNumber
                ref = {inputRef}
                placeholder='From'
                min={defaultMin}
                style={{ width: 100 }}
                value={minValue}
                onChange={newMin => onSearch({min: nullize(newMin), max: maxValue})}
                onKeyDown={ev => onKeyDown(ev, confirm)}
                onPressEnter={confirm}
            />
            <InputNumber
                placeholder='To'
                min={defaultMin}
                style={{ width: 100 }}
                value={maxValue}
                onChange={newMax => onSearch({min: minValue, max: nullize(newMax)})}
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

  export default RangeFilterComponent