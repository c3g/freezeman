import React, {useRef} from "react";
import {Button, Input, InputNumber, Radio, Select, Switch, Space, Tooltip} from "antd";
import {SearchOutlined} from "@ant-design/icons";

import {FILTER_TYPE} from "../../constants";

const EMPTY_VALUE = '__EMPTY_VALUE__'

export default function getFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const dataIndex = column.dataIndex
  const description = descriptions[dataIndex]

  if (!description)
    return undefined;
  switch (description.type) {
    case FILTER_TYPE.INPUT:
      return getInputFilterProps(column, descriptions, filters, setFilter, setFilterOption)
    case FILTER_TYPE.SELECT:
      if (description.mode !== 'multiple')
        return getRadioFilterProps(column, descriptions, filters, setFilter)
      return getSelectFilterProps(column, descriptions, filters, setFilter)
    case FILTER_TYPE.RANGE:
      return getRangeFilterProps(column, descriptions, filters, setFilter)
  }
  throw new Error(`unreachable: ${description.type}`)
}

function getInputFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];
  const value = filters[dataIndex]?.value;
  const options = filters[dataIndex]?.options;

  const inputRef = useRef()

  const onSearch = value => {
    setFilter(dataIndex, value)
  }

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  const onToggleSwitch = checked => {
    setFilterOption(dataIndex, 'exactMatch', checked)
  }

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm }) => (
      <div style={{ padding: 8, display: 'flex', alignItems: 'center' }}>
        <Input
          ref={inputRef}
          allowClear
          placeholder={`Search ${description.label}`}
          style={{ marginRight: 8 }}
          value={value}
          onChange={e => onSearch(e.target.value)}
          onPressEnter={confirm}
          onKeyDown={ev => onKeyDown(ev, confirm)}
        />
        <Tooltip title="Exact Match">
          <Switch
            size='small'
            checked={options?.exactMatch ?? false}
            onChange={e => onToggleSwitch(e, dataIndex)}
          />
        </Tooltip>
      </div>
    ),
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => inputRef?.current.select(), 100);
        document.body.classList.add('input-dropdown-visible')
      }
      else {
        document.body.classList.remove('input-dropdown-visible')
      }
    },
  }
}

function getSelectFilterProps(column, descriptions, filters, setFilter) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];
  const value = filters[dataIndex]?.value;

  const selectRef = useRef()

  const onSearch = (value) => {
    setFilter(dataIndex, value.length === 0 ? undefined : value)
  }

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  const options = description.options || column.options || []

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm }) => (
      <div style={{ padding: 8 }}>
        <Select
          ref={selectRef}
          style={{ width: 188, display: 'block' }}
          placeholder={`Select ${column.title}`}
          mode='multiple'
          allowClear
          options={options}
          value={value}
          onChange={e => onSearch(e)}
          onKeyDown={ev => onKeyDown(ev, confirm)}
        />
      </div>
    ),
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => selectRef?.current.focus(), 100);
      }
    },
  }
}

function getRadioFilterProps(column, descriptions, filters, setFilter) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];
  const value = filters[dataIndex]?.value;

  const buttonRef = useRef()

  const onSearch = (ev, confirm) => {
    const value = typeof ev === 'string' ? ev : ev.target.value
    const storeValue = value === EMPTY_VALUE ? undefined : value
    setFilter(dataIndex, storeValue)
    confirm()
  }

  const options = description.options || column.options || []

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm }) => (
      <div style={{ padding: 8 }}>
        <Radio.Group
          value={value}
          onChange={ev => onSearch(ev, confirm)}
        >
          <Radio.Button key={EMPTY_VALUE} value={EMPTY_VALUE} ref={buttonRef}>
            {description.placeholder}
          </Radio.Button>
          {
            options.map(item =>
              <Radio.Button key={item.value} value={item.value}>
                {item.label}
              </Radio.Button>
            )
          }
        </Radio.Group>
      </div>
    ),
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => buttonRef?.current.focus(), 100);
      }
    },
  }
}

function getRangeFilterProps(column, descriptions, filters, setFilter) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];
  const value = filters[dataIndex]?.value;
  const minValue = value?.min
  const maxValue = value?.max

  const inputRef = useRef()

  const onSearch = (values) => {
    setFilter(dataIndex, values)
  }

  const onReset = () => {
    setFilter(dataIndex, undefined)
  };

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input.Group compact style={{ marginBottom: 8 }}>
          <InputNumber
            ref={inputRef}
            placeholder='From'
            min={0}
            style={{ width: 100 }}
            value={minValue}
            onChange={newMin => onSearch({min: nullize(newMin), max: maxValue})}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            onPressEnter={confirm}
          />
          <InputNumber
            placeholder='To'
            min={0}
            style={{ width: 100 }}
            value={maxValue}
            onChange={newMax => onSearch({min: minValue, max: nullize(newMax)})}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            onPressEnter={confirm}
          />
        </Input.Group>
        <Space>
          <Button
            type="primary"
            onClick={confirm}
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
    ),
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => inputRef?.current.focus(), 100);
      }
    },
  }
}


function getFilterIcon(filtered) {
  return (
    <SearchOutlined
      style={{ color: filtered ? '#ff9800' : undefined }}
    />
  )
}

function nullize(v) {
  if (v === '')
    return null
  return v
}
