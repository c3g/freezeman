import React, { useEffect, useRef } from 'react'
import { Select } from 'antd'

const SelectFilter = ({value, title, options, dataIndex, setFilter, confirm, visible}) => {

    const selectRef = useRef()

    const onSearch = (value) => {
      setFilter(dataIndex, value.length === 0 ? undefined : value)
    }
  
    const onKeyDown = (ev, confirm) => {
      if (ev.key === 'Escape')
        confirm()
    }

    useEffect(() => {
        if (visible) {
          setTimeout(() => {selectRef.current?.focus()}, 100)
        }
      }, [visible])
  
    return (
      <div style={{ padding: 8 }}>
          <Select
            ref={selectRef}
            style={{ width: 200, display: 'block' }}
            placeholder={`Select ${title}`}
            mode='multiple'
            allowClear
            options={options}
            value={value}
            onChange={e => onSearch(e)}
            onKeyDown={ev => onKeyDown(ev, confirm)}
          />
        </div>
    )
  }

  export default SelectFilter