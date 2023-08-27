import { Radio } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { FilterSet, FilterSetting, SetFixedFilterFunc } from '../../models/paged_items'
import { FILTER_TYPE } from '../../constants'
import { useAppDispatch } from '../../hooks'

/**
 * A radio group for filtering samples by category - 
 * sample, pool, library, or all.
 */

export enum SampleCategory {
	POOLS = "Pools",
	SAMPLES = "Samples",
	LIBRARIES = "Libraries",
	ALL = "All"
}

export function getSampleCategoryFilterSetting(category: SampleCategory, isPooledFilterKey = 'is_pooled') {
	let value : string
	switch(category) {
		case SampleCategory.POOLS: {
			value = 'true'
			break
		}
		case SampleCategory.SAMPLES:
		case SampleCategory.LIBRARIES: {
			value= 'false'
			break
		}
		default:
			value = ''
	}
	const filterSetting: FilterSetting = {
		value,
		description: {
			key: isPooledFilterKey,
			label: 'Pooled Samples',
			type: FILTER_TYPE.SELECT
		}
	}
	return filterSetting
}

interface SampleCategoryChooserProps {
	disabled: boolean
	filters: FilterSet
	setFixedFilter: SetFixedFilterFunc
	onChange: (category: SampleCategory) => void
	isPooledFilterKey?: string
}

function SampleCategoryChooser({
	disabled, filters, setFixedFilter, onChange, isPooledFilterKey = 'is_pooled'
}: SampleCategoryChooserProps) {

	const [sampleCategory, setSampleCategory] = useState<SampleCategory>(SampleCategory.ALL)

	useEffect(() => {
		let category = SampleCategory.ALL
		const isPooledFilter = filters[isPooledFilterKey]
		if (isPooledFilter) {
			if (isPooledFilter.value === 'true') {
				category = SampleCategory.POOLS
			} else if (isPooledFilter.value === 'false') {
				category = SampleCategory.SAMPLES
			}
		}
		setSampleCategory(category)
	}, [filters, isPooledFilterKey])

	const handleSampleCategoryChange = useCallback((category: SampleCategory) => {
		const filterSetting = getSampleCategoryFilterSetting(category, isPooledFilterKey)
		setFixedFilter(filterSetting)
		setSampleCategory(category)
		onChange(category)
	}, [isPooledFilterKey, onChange, setFixedFilter])

	return (
		<Radio.Group disabled={disabled} value={sampleCategory} onChange={evt => {handleSampleCategoryChange(evt.target.value)}}>
         <Radio.Button value={SampleCategory.SAMPLES}> Samples </Radio.Button>
         <Radio.Button value={SampleCategory.POOLS}> Pools </Radio.Button>
         <Radio.Button value={SampleCategory.ALL}> All </Radio.Button>
      </Radio.Group>
	)
}

export default SampleCategoryChooser