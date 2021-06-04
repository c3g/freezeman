import React, {useRef} from "react";
import {Button, Input, InputNumber, Radio, Select, Switch, Space, Tooltip, DatePicker} from "antd";
import {SearchOutlined, InfoCircleOutlined} from "@ant-design/icons";
import moment from 'moment';

import {FILTER_TYPE, DATE_FORMAT} from "../../constants";

const EMPTY_VALUE = '__EMPTY_VALUE__'
const { RangePicker } = DatePicker;

export default function getFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const dataIndex = column.dataIndex
  const description = descriptions[dataIndex]

  if (!description)
    return undefined;
  switch (description.type) {
    case FILTER_TYPE.INPUT:
      return getInputFilterProps(column, descriptions, filters, setFilter, setFilterOption)
    case FILTER_TYPE.INPUT_NUMBER:
        return getInputNumberFilterProps(column, descriptions, filters, setFilter, setFilterOption)
    case FILTER_TYPE.SELECT:
      if (description.mode !== 'multiple')
        return getRadioFilterProps(column, descriptions, filters, setFilter)
      return getSelectFilterProps(column, descriptions, filters, setFilter)
    case FILTER_TYPE.RANGE:
      return getRangeFilterProps(column, descriptions, filters, setFilter)
    case FILTER_TYPE.DATE_RANGE:
      return getDateRangeFilterProps(column, descriptions, filters, setFilter)
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

  const onToggleSwitch = (key, checked )=> {
    setFilterOption(dataIndex, key, checked)
  }

  const onChangeRecursive = checked => {
    onToggleSwitch( 'recursiveMatch', checked)
    setFilterOption(dataIndex, 'exactMatch', checked)
  }

  return {
    filterIcon: getFilterIcon(Boolean(value)),
    filterDropdown: ({ confirm }) => (
      <div style={{ padding: 8, alignItems: 'center' }}>
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
          {description.batch &&
             <Tooltip title="This field can be searched by batch">
              <InfoCircleOutlined />
            </Tooltip>
          }
        </div>
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

function getInputNumberFilterProps(column, descriptions, filters, setFilter, setFilterOption) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];
  const value = filters[dataIndex]?.value;

  const inputRef = useRef()

  const onSearch = value => {
    setFilter(dataIndex, value)
  }

  const onKeyDown = (ev, confirm) => {
    if (ev.key === 'Escape')
      confirm()
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
  const defaultMin = description.defaultMin ?? 0
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
            min={defaultMin}
            style={{ width: 100 }}
            value={minValue}
            onChange={newMin => onSearch({min: nullize(newMin), max: maxValue})}
            onKeyDown={ev => onKeyDown(ev, confirm)}
            onPressEnter={confirm}
          />
          <InputNumber
            placeholder='To'
            min={defaultMin}
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

function getDateRangeFilterProps(column, descriptions, filters, setFilter) {
  const dataIndex = column.dataIndex;
  const description = descriptions[dataIndex];
  const value = filters[dataIndex]?.value;
  const minValue = value && nullize(value.min) && moment(value.min) 
  const maxValue = value && nullize(value.max) && moment(value.max)

  const dateRangeRef = useRef()

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
          <RangePicker
            ref={dateRangeRef}
            style={{ width: 300 }}
            format={DATE_FORMAT}
            allowEmpty={[true, true]}
            defaultValue={[null, null]}
            value={[minValue, maxValue]}
            onChange={dates => {
              const newDates = {}
              newDates.min = nullize(dates[0]) && dates[0].isValid && dates[0].toISOString().slice(0, 10) || undefined
              newDates.max = nullize(dates[1]) && dates[1].isValid && dates[1].toISOString().slice(0, 10) || undefined
              onSearch(newDates)
            }}
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
        setTimeout(() => dateRangeRef?.current.focus(), 100);
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
