import React, { useEffect, useRef } from 'react'
import { Switch, Tooltip } from 'antd'
import DebouncedInput from './DebouncedInput'


const InputFilter = ({value, options, description, dataIndex, setFilter, setFilterOption, confirm, visible}) => {

    const inputRef = useRef()

    const onSearch = value => {
      setFilter(dataIndex, value)
    }
  
    const onKeyDown = (ev, confirm) => {
      if (ev.key === 'Escape')
        confirm()
    }
  
    const onToggleSwitch = (key, checked )=> {
      setFilterOption(dataIndex, key, checked)
    }
  
    const onChangeRecursive = checked => {
      onToggleSwitch( 'recursiveMatch', checked)
      setFilterOption(dataIndex, 'exactMatch', checked)
    }
  
    useEffect(() => {
      if (visible) {
        setTimeout(() => {inputRef.current?.select()}, 100)
      }
    }, [visible])
  
    return (
      <div style={{ padding: 8, alignItems: 'center' }}>
            <DebouncedInput
              ref={inputRef}
              allowClear
              placeholder={`Search ${description.label}`}
              style={{ marginRight: 8 }}
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
                  checked={options?.exactMatch ?? false}
                  disabled={options?.recursiveMatch ?? false}
                  onChange={e => onToggleSwitch( 'exactMatch', e)}
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