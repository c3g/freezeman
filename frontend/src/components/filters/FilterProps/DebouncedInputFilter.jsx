import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Input, Switch, Tooltip } from 'antd'

/**
 * A hook to debounce function calls until after the specified time.
 * This is used to avoid triggering calls to the backend while the user
 * is typing in a filter.
 * @param {*} debouncedFunction 
 * @param {*} debounceTime 
 * @returns 
 */
const useDebounce = (debouncedFunction, debounceTime = 500) => {
    let timer
    function caller(...args) {
        const context = this
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            timer = null
            debouncedFunction.apply(context, args)
        }, debounceTime)
    }
    return useCallback(caller, [])
}

const DebouncedInputFilter = ({ value, options, description, dataIndex, setFilter, setFilterOption, confirm, visible }) => {

    // The input box keeps its current value in this state.
    // The value is initialized with the filter value received as props, but
    // the text is independent of the filter value (so that the user can type without
    // triggering a fetch request on every keystroke).
    const [filterText, setFilterText] = useState(value)

    const inputRef = useRef()

    // Create a debounced version of setFilter
    const debouncedSetFilter = useDebounce(setFilter)

    const onSearch = value => {
        // Update the local state of the input.
        setFilterText(value)
        // Update the filter, or wait until debounce times out.
        debouncedSetFilter(dataIndex, value)
    }

    // Reset the filter text if value has changed - normally because the user has cleared
    // all filters and the filter value has been reset to undefined.
    // While the user is typing the filterState will be ahead of value, but once the
    // user stops typing then setFilter is called and the value is updated and
    // will match filterState.
    useEffect(() => {
        if (filterText !== value) {
            setFilterText(value)
        }
    }, [value])

    // Focus the text input field when the filter becomes visible
    useEffect(() => {
        if (visible) {
            setTimeout(() => { inputRef.current?.select() }, 100)
        }
    }, [visible])

    const onKeyDown = (ev, confirm) => {
        if (ev.key === 'Escape')
            confirm()
    }

    const onToggleSwitch = (key, checked) => {
        setFilterOption(dataIndex, key, checked)
    }

    const onChangeRecursive = checked => {
        onToggleSwitch('recursiveMatch', checked)
        setFilterOption(dataIndex, 'exactMatch', checked)
    }

    return (
        <div style={{ padding: 8, alignItems: 'center' }}>
            <Input
                ref={inputRef}
                allowClear
                placeholder={`Search ${description.label}`}
                style={{ marginRight: 8 }}
                value={filterText}
                onChange={e => onSearch(e.target.value)}
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
                        onChange={e => onToggleSwitch('exactMatch', e)}
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

export default DebouncedInputFilter