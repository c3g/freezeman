import React, {useRef} from "react";
import {Button, Input, InputNumber, Radio, Select, Switch, Space} from "antd";
import "antd/es/button/style/css";
import "antd/es/input/style/css";
import "antd/es/radio/style/css";
import "antd/es/select/style/css";
import "antd/es/switch/style/css";
import "antd/es/space/style/css";
import {SearchOutlined} from "@ant-design/icons";

import {FILTER_TYPE} from "../../constants";

const EMPTY_VALUE = '__EMPTY_VALUE__'

export default function getFilterProps(column, descriptions, filters, setFilterValue, setFilterOptions) {
  const description = descriptions[column.dataIndex];
  if (!description)
    return undefined;
  switch (description.type) {
    case FILTER_TYPE.INPUT:
      return getInputFilterProps(column, descriptions, filters, setFilterValue, setFilterOptions)
    case FILTER_TYPE.SELECT:
      if (description.mode !== 'multiple')
        return getRadioFilterProps(column, descriptions, filters, setFilterValue)
      return getSelectFilterProps(column, descriptions, filters, setFilterValue)
    case FILTER_TYPE.RANGE:
      return getRangeFilterProps(column, descriptions, filters, setFilterValue)
  }
  throw new Error(`unreachable: ${description.type}`)
}

function getInputFilterProps(column, descriptions, filters, setFilterValue, setFilterOptions) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];

  const inputRef = useRef()

  const onSearch = (selectedKeys, setSelectedKeys) => {
    setSelectedKeys(selectedKeys)
    setFilterValue(dataIndex, selectedKeys[0])
  }

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  const onToggleSwitch = (checked) => {
    setFilterOptions(dataIndex, {exactMatch: checked})
  }

  return {
    filteredValue: arrayize(filters[dataIndex]),
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={inputRef}
          allowClear
          placeholder={`Search ${dataIndex}`}
          value={selectedKeyValue(selectedKeys[0])}
          onChange={e => onSearch(e.target.value ? [e.target.value] : [], setSelectedKeys)}
          onPressEnter={confirm}
          onKeyDown={ev => onKeyDown(ev, confirm)}
        />
        <div style={{ margin: 8, textAlign: 'center'}}>
          <Switch
            checked={selectedKeyOptionExactMatch(selectedKeys[0])}
            onChange={e => onToggleSwitch(e, dataIndex)}
          /> Exact Match
        </div>
      </div>
    ),
    filterIcon: getFilterIcon,
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

function getSelectFilterProps(column, descriptions, filters, setFilterValue) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];

  const selectRef = useRef()

  const onSearch = (selectedKeys, setSelectedKeys, confirm) => {
    setSelectedKeys(selectedKeys);
    if (selectedKeys.length === 0)
      setFilterValue(dataIndex, undefined)
    else
      setFilterValue(dataIndex, selectedKeys)
    if (confirm)
      confirm()
  }

  const onReset = clearFilters => {
    setFilterValue(dataIndex, undefined)
    clearFilters()
  };

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  const options = description.options || column.options || []

  return {
    filteredValue: arrayize(filters[dataIndex]),
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
    filterIcon: getFilterIcon,
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => selectRef?.current.focus(), 100);
      }
    },
  }
}

function getRadioFilterProps(column, descriptions, filters, setFilterValue) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];

  const buttonRef = useRef()

  const onSearch = (ev, setSelectedKeys, confirm, clearFilters) => {
    const value = typeof ev === 'string' ? ev : ev.target.value
    const tableValue = value === EMPTY_VALUE ? [] : [value]
    const storeValue = value === EMPTY_VALUE ? undefined : value
    setSelectedKeys(tableValue)
    setFilterValue(dataIndex, storeValue)
    confirm()
  }

  const options = description.options || column.options || []

  return {
    filteredValue: arrayize(filters[dataIndex]),
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
    filterIcon: getFilterIcon,
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => buttonRef?.current.focus(), 100);
      }
    },
  }
}

function getRangeFilterProps(column, descriptions, filters, setFilterValue) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];

  const inputRef = useRef()

  const onSearch = (value, confirm) => {
    setFilterValue(dataIndex, value)
    confirm()
  }

  const onReset = clearFilters => {
    setFilterValue(dataIndex, undefined)
    clearFilters()
  };

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
  }

  return {
    filteredValue: arrayize(filters[dataIndex]),
    filterDropdown: ({ setSelectedKeys, selectedKeys: value, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input.Group compact style={{ marginBottom: 8 }}>
          <InputNumber
            ref={inputRef}
            placeholder='From'
            min={0}
            style={{ width: 100 }}
            value={value ? value[0]?.value?.min : undefined}
            onChange={newMin => onSearch({min: nullize(newMin), max: value[0]?.value?.max}, setSelectedKeys)}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            //onPressEnter={() => onSearch(value, confirm)}
          />
          <InputNumber
            placeholder='To'
            min={0}
            style={{ width: 100 }}
            value={value ? value[0]?.value?.max : undefined}
            onChange={newMax => onSearch({min: value[0]?.value?.min, max: nullize(newMax)}, setSelectedKeys)}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            //onPressEnter={() => onSearch(value, confirm)}
          />
        </Input.Group>
        <Space>
          {/*<Button*/}
          {/*  type="primary"*/}
          {/*  onClick={() => onSearch(value, confirm)}*/}
          {/*  icon={<SearchOutlined />}*/}
          {/*  size="small"*/}
          {/*  style={{ width: 90 }}*/}
          {/*>*/}
          {/*  Search*/}
          {/*</Button>*/}
          <Button onClick={() => onReset(clearFilters)} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: getFilterIcon,
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