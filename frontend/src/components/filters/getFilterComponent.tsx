import moment from 'moment'
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
import DateRangeFilter from './FilterProps/DateRange'
import InputFilter from './FilterProps/InputFilter'
import InputNumberFilter from './FilterProps/InputNumberFilter'
import RadioFilter from './FilterProps/RadioFilter'
import RangeFilterComponent from './FilterProps/RangeFilter'
import SelectFilter from './FilterProps/SelectFilter'
import { isValidInteger, isValidObjectID } from './validators'
import MetadataFilter from './FilterProps/MetadataFilter'

export function getFilterComponent(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	setFilterOption: SetFilterOptionFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
) {
	switch (description.type) {
		case FILTER_TYPE.INPUT: {
			return getInputFilter(description, filterSetting, setFilter, setFilterOption, confirm, visible)
		}
		case FILTER_TYPE.INPUT_NUMBER: {
			return getInputNumberFilter(description, filterSetting, setFilter, confirm, visible)
		}
		case FILTER_TYPE.INPUT_OBJECT_ID: {
			return getInputObjectIdFilter(description, filterSetting, setFilter, confirm, visible)
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
	visible = true // Used by column filters
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
		/>
	)
}

export function getInputNumberFilter(
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
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
		/>
	)
}

export function getInputObjectIdFilter( // TODO update getFilterPropsTS
	description: FilterDescription,
	filterSetting: FilterSetting | undefined,
	setFilter: SetFilterFunc,
	confirm = () => true, // Used by column filters
	visible = true // Used by column filters
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
	const value = filterSetting?.value
	let minValue, maxValue

	if (isRangeFilterValue(value)) {
		minValue = value.min
		maxValue = value.max
	}

	return (
		<RangeFilterComponent
			description={description}
			minValue={minValue}
			maxValue={maxValue}
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
	let minValue, maxValue
	if (isRangeFilterValue(value)) {
		minValue = value && nullize(value.min) && moment(value.min)
		maxValue = value && nullize(value.max) && moment(value.max)
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
