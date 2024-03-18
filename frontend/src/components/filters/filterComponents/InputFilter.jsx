import React, { useEffect, useRef } from 'react'
import { Switch, Tooltip } from 'antd'
import DebouncedInput from './DebouncedInput'




const InputFilter = ({value, options, description, filterKey, setFilter, setFilterOption, confirm, visible}) => {

    const inputRef = useRef()

    const onSearch = value => {
      setFilter(filterKey, value, description)
    }
  
    const onKeyDown = (ev, confirm) => {
      ev.stopPropagation()
      if (ev.key === 'Escape' || ev.key === 'Enter') {
        confirm()
      }
    }
  
    const onToggleSwitch = (key, checked )=> {
      setFilterOption(filterKey, key, checked, description)
    }
  
    const onChangeRecursive = checked => {
      onToggleSwitch( 'recursiveMatch', checked)
      setFilterOption(filterKey, 'startsWith', checked, description)
    }
  
    useEffect(() => {
      if (visible) {
        setTimeout(() => {inputRef.current?.select()}, 100)
      }
    }, [visible])
  
    return (
      <div style={{ alignItems: 'center' }}>
            <DebouncedInput
              ref={inputRef}
              allowClear
              placeholder={`Search ${description.label}`}
              style={{ marginRight: 8, width: description.width }}
              value={value}
              onInputChange={text => onSearch(text)}
              onPressEnter={confirm}
              onKeyDown={ev => onKeyDown(ev, confirm)}
            />
            <div style={{ padding: 8, alignItems: 'right' }}>
              <Tooltip title="Exact Match">
                <Switch
                  size="large"
                  checkedChildren="Exact"
                  unCheckedChildren="Exact"
                  checked={options?.startsWith ?? false}
                  disabled={options?.recursiveMatch ?? false}
                  onChange={e => onToggleSwitch( 'startsWith', e)}
                />
              </Tooltip>
              {description.recursive &&
                <Tooltip title="Exhaustive">
                  <Switch
                    checkedChildren="Recursive"
                    unCheckedChildren="Recursive"
                    checked={options?.recursiveMatch ?? false}
                    onChange={onChangeRecursive}
                  />
                </Tooltip>
              }
            </div>
        </div>
    )
  }

  export default InputFilter
