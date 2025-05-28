import React, { useEffect, useRef } from 'react'
import {Button, Input, InputNumber, Space } from 'antd'
import {SearchOutlined} from "@ant-design/icons"
import { nullize } from '../../../utils/nullize'

const RangeFilterComponent = ({minValue, defaultMin, maxValue, filterKey, setFilter, confirm, visible, description}) => {

    const inputRef = useRef()

    const onSearch = (values) => {
      setFilter(filterKey, values, description)
    }
  
    const onReset = () => {
      setFilter(filterKey, undefined, description)
    };
  
    const onKeyDown = (ev, confirm) => {
      ev.stopPropagation()
      if (ev.key === 'Escape' || ev.key === 'Enter') {
        confirm()
      }
    }

    useEffect(() => {
        if (visible) {
          setTimeout(() => {inputRef.current?.focus()}, 100)
        }
      }, [visible])
  
    return (
      <div>
          <Input.Group compact style={{ marginBottom: 8 }}>
            <InputNumber
                ref = {inputRef}
                placeholder='From'
                min={defaultMin}
                style={{ width: 100 }}
                onChange={newMin => onSearch({min: nullize(newMin), max: maxValue})}
                onKeyDown={ev => onKeyDown(ev, confirm)}
                onPressEnter={confirm}
            />
            <InputNumber
                placeholder='To'
                min={defaultMin}
                style={{ width: 100 }}
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