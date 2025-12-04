import React, { useEffect, useRef } from 'react'
import { Flex, Switch, SwitchProps, Tooltip } from 'antd'
import DebouncedInput, { DebouncedInputProps } from './DebouncedInput'
import { FilterDescription, FilterOptions, FilterValue, SetFilterFunc, SetFilterOptionFunc } from '../../../models/paged_items'


export interface InputFilterProps {
    value: FilterValue | undefined
    options: FilterOptions | undefined
    description: FilterDescription
    filterKey: FilterDescription['key']
    setFilter: SetFilterFunc
    setFilterOption: SetFilterOptionFunc
    confirm: () => boolean
    visible: boolean
    debounceDelay?: number
}

const InputFilter = ({ value, options, description, filterKey, setFilter, setFilterOption, confirm, visible, debounceDelay }: InputFilterProps) => {

    const inputRef = useRef<any>()

    const onSearch: DebouncedInputProps['onInputChange'] = (value) => {
        setFilter(filterKey, value, description)
    }

    const onKeyDown: DebouncedInputProps['onKeyDown'] = (ev) => {
        ev.stopPropagation()
        if (ev.key === 'Escape' || ev.key === 'Enter') {
            confirm()
        }
    }

    const onToggleSwitch = (key: string, checked: boolean) => {
        setFilterOption(filterKey, key, checked, description)
    }

    const onChangeRecursive: SwitchProps['onChange'] = checked => {
        onToggleSwitch('recursiveMatch', checked)
        setFilterOption(filterKey, 'exactMatch', checked, description)
    }

    useEffect(() => {
        if (visible) {
            setTimeout(() => { inputRef.current?.select() }, 100)
        }
    }, [visible])

    return (
        <div style={{ alignItems: 'center' }}>
            <DebouncedInput
                ref={inputRef}
                allowClear
                placeholder={`Search ${description.label}`}
                style={{ marginRight: 8, width: description.width }}
                value={value?.toString()}
                onInputChange={onSearch}
                onPressEnter={confirm}
                onKeyDown={onKeyDown}
                debounceDelay={debounceDelay}
            />
            <Flex justify={"space-evenly"} style={{ marginTop: 8 }}>
                <Switch
                    size={"default"}
                    checkedChildren="Starts with"
                    unCheckedChildren="Starts with"
                    checked={options?.startsWith ?? false}
                    disabled={(options?.recursiveMatch ?? false) || (options?.exactMatch ?? false)}
                    onChange={e => onToggleSwitch('startsWith', e)}
                />
                <Tooltip title="Match against the entire text.">
                    <Switch
                        size={"default"}
                        checkedChildren="Exact"
                        unCheckedChildren="Exact"
                        checked={options?.exactMatch ?? false}
                        disabled={(options?.recursiveMatch ?? false) || (options?.startsWith ?? false)}
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
            </Flex>
        </div>
    )
}

export default InputFilter
