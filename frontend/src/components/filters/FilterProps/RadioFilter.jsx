import React, { useEffect, useRef } from 'react'
import { Radio } from 'antd'

const RadioFilter = ({value, options, description, filterKey, setFilter, confirm, visible}) => {

    const EMPTY_VALUE = '__EMPTY_VALUE__'

    const focusRef = useRef()

    const onSearch = (ev, confirm) => {
      const value = typeof ev === 'string' ? ev : ev.target.value
      const storeValue = value === EMPTY_VALUE ? undefined : value
      setFilter(filterKey, storeValue, description)
      confirm()
    }
  
    useEffect(() => {
        if (visible) {
          // Focus the button which matches the current value of the radio group.
          setTimeout(() => {focusRef.current?.focus()}, 100)
        }
      }, [visible])

    return (
      <div style={{ padding: 8 }}>
          <Radio.Group
            value={value}
            onChange={ev => onSearch(ev, confirm)}
          >
            <Radio.Button key={EMPTY_VALUE} value={EMPTY_VALUE} ref={value === undefined ? focusRef : undefined}>
              {description.placeholder}
            </Radio.Button>
            {
              options.map(item =>
                <Radio.Button key={item.value} value={item.value} ref={value === item.value ? focusRef : undefined}>
                  {item.label}
                </Radio.Button>
              )
            }
          </Radio.Group>
        </div>
    )
  }

  export default RadioFilter