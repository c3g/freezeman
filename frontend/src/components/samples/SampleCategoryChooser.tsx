import { Radio } from 'antd'
import React, { useCallback } from 'react'
import { FilterSet, FilterSetting, SetFixedFilterFunc } from '../../models/paged_items'
import { FILTER_TYPE } from '../../constants'

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
	sampleCategory: SampleCategory
	onChange: (category: SampleCategory) => void
	samplesLabel?: string		// Used to override the "Samples" radio button name for Libraries
	isPooledFilterKey?: string
}

function SampleCategoryChooser({
	disabled, setFixedFilter, sampleCategory, onChange, samplesLabel, isPooledFilterKey = 'is_pooled'
}: SampleCategoryChooserProps) {

	const handleSampleCategoryChange = useCallback((category: SampleCategory) => {
		const filterSetting = getSampleCategoryFilterSetting(category, isPooledFilterKey)
		setFixedFilter(filterSetting)
		onChange(category)
	}, [isPooledFilterKey, onChange, setFixedFilter])

	return (
		<Radio.Group disabled={disabled} value={sampleCategory} onChange={evt => {handleSampleCategoryChange(evt.target.value)}}>
         <Radio.Button value={SampleCategory.SAMPLES}> {samplesLabel ?? 'Samples'} </Radio.Button>
         <Radio.Button value={SampleCategory.POOLS}> Pools </Radio.Button>
         <Radio.Button value={SampleCategory.ALL}> All </Radio.Button>
      </Radio.Group>
	)
}

export default SampleCategoryChooser