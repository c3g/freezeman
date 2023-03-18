import React, { useEffect, useRef, useState } from 'react'
import DebouncedInput from './DebouncedInput'

const InputNumberFilter = ({value, validationFunc, description, filterKey, setFilter, confirm, visible}) => {

    const [isValid, setIsValid] = useState(true)
    const inputRef = useRef()
  
    const onSearch = value => {
      // If a validation function was provided, use it to validate the numeric input.
      // If it's invalid, set the input status as invalid and ignore the value.
      // This is to avoid sending bad requests with garbage values to the backend.
      if (typeof(validationFunc) === 'function') {
        if (value.length === 0 || validationFunc(value)) {
          setFilter(filterKey, value, description)
          setIsValid(true)
        } else {
          setIsValid(false)
        }
      } else {
        // If no validation function is provided then just call setFilter with the value.
        setFilter(filterKey, value, description)
      }
    }
  
    const onKeyDown = (ev, confirm) => {
      if (ev.key === 'Escape')
        confirm()
    }

    useEffect(() => {
        if (visible) {
          setTimeout(() => {inputRef.current?.select()}, 100)
        }
      }, [visible])
  
  
    return (
        <div style={{ padding: 8, display: 'flex', alignItems: 'center' }}>
            <DebouncedInput
              ref={inputRef}
              allowClear
              placeholder={`Search ${description.label}`}
              style={{ marginRight: 8 }}
              value={value}
              onInputChange={num => onSearch(num)}
              onPressEnter={confirm}
              onKeyDown={ev => onKeyDown(ev, confirm)}
              status={isValid ? undefined : 'error'}
            />
        </div>
    )
  }

  export default InputNumberFilter
  