import React, { useEffect, useRef, useState } from 'react'
import { Button, Input, InputNumber, Space } from 'antd'
import { SearchOutlined } from "@ant-design/icons"
import { nullize } from '../../../utils/nullize'
import { FilterDescription, SetFilterFunc } from '../../../models/paged_items'


export interface RangeFilterProps {
  defaultMin?: number
  filterKey: string
  setFilter: SetFilterFunc
  confirm: () => void
  visible: boolean
  description: FilterDescription
}

function RangeFilterComponent({defaultMin, filterKey, setFilter, confirm, visible, description}: RangeFilterProps) {

    const inputRef = useRef<HTMLInputElement>(null)

    const [minValue, setMinValue] = useState<string | undefined>(undefined)
    const [maxValue, setMaxValue] = useState<string | undefined>(undefined)
    const onSearch = (values: any) => {
      setMinValue(values.min)
      setMaxValue(values.max)
      setFilter(filterKey, values, description)
    }
  
    const onReset = () => {
      setMinValue(undefined)
      setMaxValue(undefined)
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
                min={defaultMin?.toString()}
                style={{ width: 100 }}
                onChange={newMin => onSearch({min: nullize(newMin), max: maxValue})}
                onKeyDown={ev => onKeyDown(ev, confirm)}
                onPressEnter={confirm}
                stringMode
            />
            <InputNumber
                placeholder='To'
                min={minValue}
                style={{ width: 100 }}
                onChange={newMax => onSearch({min: minValue, max: nullize(newMax)})}
                onKeyDown={ev => onKeyDown(ev, confirm)}
                onPressEnter={confirm}
                stringMode
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