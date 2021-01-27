import React, {useRef} from "react";
import {Button, Input, InputNumber, Radio, Select, Switch, Space, Tooltip} from "antd";
import "antd/es/button/style/css";
import "antd/es/input/style/css";
import "antd/es/radio/style/css";
import "antd/es/select/style/css";
import "antd/es/switch/style/css";
import "antd/es/space/style/css";
import "antd/es/tooltip/style/css";
import {SearchOutlined} from "@ant-design/icons";

import {FILTER_TYPE} from "../../constants";

const EMPTY_VALUE = '__EMPTY_VALUE__'

export default function getFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const description = descriptions[column.dataIndex];
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

  const inputRef = useRef()

  const onSearch = (selectedKeys, setSelectedKeys) => {
    setSelectedKeys(selectedKeys)
    setFilter(dataIndex, selectedKeys[0])
  }

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  const onToggleSwitch = (checked) => {
    setFilterOption(dataIndex, 'exactMatch', checked)
  }

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filteredValue: arrayize(value),
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8, display: 'flex', alignItems: 'center' }}>
        <Input
          ref={inputRef}
          allowClear
          placeholder={`Search ${dataIndex}`}
          style={{ marginRight: 8 }}
          value={selectedKeyValue(selectedKeys[0])}
          onChange={e => onSearch(e.target.value ? [e.target.value] : [], setSelectedKeys)}
          onPressEnter={confirm}
          onKeyDown={ev => onKeyDown(ev, confirm)}
        />
        <Tooltip title="Exact Match">
          <Switch
            size='small'
            checked={selectedKeyOptionExactMatch(selectedKeys[0])}
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

  const onSearch = (selectedKeys, setSelectedKeys, confirm) => {
    setSelectedKeys(selectedKeys);
    if (selectedKeys.length === 0)
      setFilter(dataIndex, undefined)
    else
      setFilter(dataIndex, selectedKeys)
    if (confirm)
      confirm()
  }

  const onReset = clearFilters => {
    setFilter(dataIndex, undefined)
    clearFilters()
  };

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  const options = description.options || column.options || []

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filteredValue: arrayize(value),
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Space style={{ marginBottom: 8 }}>
          <Button
            type="primary"
            onClick={() => onSearch(selectedKeys, setSelectedKeys, confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button onClick={() => onReset(clearFilters)} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
        <Select
          ref={selectRef}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
          placeholder={`Select ${column.title}`}
          mode='multiple'
          options={options}
          value={description.mode === 'multiple' ? selectedKeyValue(selectedKeys) : selectedKeyValue(selectedKeys[0])}
          onChange={e => onSearch(e, setSelectedKeys, null)}
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

  const onSearch = (ev, setSelectedKeys, confirm, clearFilters) => {
    const value = typeof ev === 'string' ? ev : ev.target.value
    const tableValue = value === EMPTY_VALUE ? [] : [value]
    const storeValue = value === EMPTY_VALUE ? undefined : value
    setSelectedKeys(tableValue)
    setFilter(dataIndex, storeValue)
    confirm()
  }

  const options = description.options || column.options || []

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filteredValue: arrayize(value),
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Radio.Group
          value={selectedKeys[0]?.value ? selectedKeys[0].value : EMPTY_VALUE}
          onChange={ev => onSearch(ev, setSelectedKeys, confirm, clearFilters)}
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

  const inputRef = useRef()

  const onSearch = (values, setSelectedKeys, confirm) => {
    setSelectedKeys(values)
    setFilter(dataIndex, values)

    if(confirm)
      confirm()
  }

  const onReset = clearFilters => {
    setFilter(dataIndex, undefined)
    clearFilters()
  };

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filteredValue: arrayize(value),
    filterDropdown: ({ setSelectedKeys, selectedKeys: value, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input.Group compact style={{ marginBottom: 8 }}>
          <InputNumber
            ref={inputRef}
            placeholder='From'
            min={0}
            style={{ width: 100 }}
            value={minRangeValue(value)}
            onChange={newMin => onSearch({min: nullize(newMin), max: maxRangeValue(value)}, setSelectedKeys)}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            onPressEnter={() => confirm()}
          />
          <InputNumber
            placeholder='To'
            min={0}
            style={{ width: 100 }}
            value={maxRangeValue(value)}
            onChange={newMax => onSearch({min: minRangeValue(value), max: nullize(newMax)}, setSelectedKeys)}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            onPressEnter={() => confirm()}
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
            Search
          </Button>
          <Button onClick={() => onReset(clearFilters)} size="small" style={{ width: 90 }}>
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

function arrayize(v) {
  if (!v)
    return null
  if (Array.isArray(v))
    return v
  return [v]
}

function selectedKeyValue(selectedKeysArg){
  return selectedKeysArg ? selectedKeysArg.value : undefined
}

function selectedKeyOptionExactMatch(selectedKeysArg){
  const checked = selectedKeysArg?.options ? selectedKeysArg.options.exactMatch : undefined
  return checked
}

function minRangeValue(value){
  return value?.[0]?.value?.min
}

function maxRangeValue(value){
  return value?.[0]?.value?.max
}
