import React, { useEffect, useRef } from 'react'
import { Select } from 'antd'

const SelectFilter = ({value, title, options, filterKey, setFilter, confirm, visible, description}) => {

    const selectRef = useRef()

    const onSearch = (value) => {
      setFilter(filterKey, value.length === 0 ? undefined : value, description)
    }
  
    const onKeyDown = (ev, confirm) => {
      ev.stopPropagation()
      if (ev.key === 'Escape') {
        confirm()
      }
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