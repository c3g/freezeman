import React from 'react'
import { FILTER_TYPE } from '../../constants'
import {
	FilterDescription,
	FilterSetting,
	SetFilterFunc,
	SetFilterOptionFunc,
	isRangeFilterValue
} from '../../models/paged_items'
import { nullize } from '../../utils/nullize'
import DateRangeFilter from './filterComponents/DateRange'
import InputFilter from './filterComponents/InputFilter'
import InputNumberFilter from './filterComponents/InputNumberFilter'
import RadioFilter from './filterComponents/RadioFilter'
import RangeFilterComponent from './filterComponents/RangeFilter'
import SelectFilter from './filterComponents/SelectFilter'
import { isValidInteger, isValidObjectID } from './validators'
import MetadataFilter from './filterComponents/MetadataFilter'
import dayjs, { Dayjs } from 'dayjs'

export function getFilterComponent(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter?: SetFilterFunc,
	setFilterOption?: SetFilterOptionFunc,
	confirm = () => true, // Used by column filters
	visible = true, // Used by column filters
	debounceDelay = 500,
) {
	if (!setFilter || !setFilterOption) {
		return null
	}
	switch (description.type) {
		case FILTER_TYPE.INPUT: {
			return getInputFilter(description, filterSetting, setFilter, setFilterOption, confirm, visible, debounceDelay)
		}
		case FILTER_TYPE.INPUT_NUMBER: {
			return getInputNumberFilter(description, filterSetting, setFilter, confirm, visible, debounceDelay)
		}
		case FILTER_TYPE.INPUT_OBJECT_ID: {
			return getInputObjectIdFilter(description, filterSetting, setFilter, confirm, visible, debounceDelay)
		}
		case FILTER_TYPE.SELECT: {
			if (description.mode === 'multiple') {
				return getSelectFilter(description, filterSetting, setFilter, confirm, visible)
			} else {
				return getRadioFilter(description, filterSetting, setFilter, confirm, visible)
			}
		}
		case FILTER_TYPE.RANGE: {
			return getRangeFilter(description, filterSetting, setFilter, confirm, visible)
		}
		case FILTER_TYPE.DATE_RANGE: {
			return getDateRangeFilter(description, filterSetting, setFilter, confirm, visible)
		}
		case FILTER_TYPE.METADATA: {
			return getMetadataFilter(description, filterSetting, setFilter)
		}
		default:
			return null
	}
}

export function getInputFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	setFilterOption: SetFilterOptionFunc,
	confirm = () => true, // Used by column filters
	visible = true, // Used by column filters
	debounceDelay = 500,
) {
	return (
		<InputFilter
			value={filterSetting?.value}
			options={filterSetting?.options}
			description={description}
			filterKey={description.key}
			setFilter={setFilter}
			setFilterOption={setFilterOption}
			confirm={confirm}
			visible={visible}
			debounceDelay={debounceDelay}
		/>
	)
}

export function getInputNumberFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true, // Used by column filters
	debounceDelay = 500,
) {
	return (
		<InputNumberFilter
			value={filterSetting?.value}
			description={description}
			filterKey={description.key}
			setFilter={setFilter}
			confirm={confirm}
			visible={visible}
			validationFunc={isValidInteger}
			debounceDelay={debounceDelay}
		/>
	)
}

export function getInputObjectIdFilter( // TODO update getFilterPropsTS
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true, // Used by column filters
	debounceDelay = 500,
) {
	return (
		<InputNumberFilter
			value={filterSetting?.value}
			description={description}
			filterKey={description.key}
			setFilter={setFilter}
			confirm={confirm}
			visible={visible}
			validationFunc={isValidObjectID}
			debounceDelay={debounceDelay}
		/>
	)
}

export function getRadioFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
) {
	return (
		<RadioFilter
			description={description}
			value={filterSetting?.value}
			options={description.options}
			filterKey={description.key}
			setFilter={setFilter}
			confirm={confirm}
			visible={visible}
		/>
	)
}

export function getSelectFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
) {
	return (
		<SelectFilter
			description={description}
			value={filterSetting?.value}
			title={description.label}
			options={description.options}
			filterKey={description.key}
			setFilter={setFilter}
			confirm={confirm}
			visible={visible}
		/>
	)
}

export function getRangeFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
) {
	return (
		<RangeFilterComponent
			description={description}
			defaultMin={description.defaultMin ?? 0}
			filterKey={description.key}
			setFilter={setFilter}
			confirm={confirm}
			visible={visible}
		/>
	)
}

export function getDateRangeFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
) {
	const value = filterSetting?.value
	let minValue: Dayjs | undefined, maxValue: Dayjs | undefined
	if (isRangeFilterValue(value)) {
		minValue = value && nullize(value.min) && dayjs(value.min)
		maxValue = value && nullize(value.max) && dayjs(value.max)
	}

	return (
		<DateRangeFilter
			description={description}
			minValue={minValue}
			maxValue={maxValue}
			filterKey={description.key}
			setFilter={setFilter}
			confirm={confirm}
			visible={visible}
		/>
	)
}

export function getMetadataFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
) {
	return (
		<MetadataFilter
			description={description}
			value={filterSetting?.value}
			setFilter={setFilter}
		/>
	)
}
