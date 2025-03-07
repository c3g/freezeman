import { Radio } from 'antd'
import React from 'react'
import { FilterSetting } from '../../models/paged_items'
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
		},
		fixed: true
	}
	return filterSetting
}

interface SampleCategoryChooserProps {
	disabled: boolean
	sampleCategory: SampleCategory
	onChange: (category: SampleCategory) => void
	samplesLabel?: string		// Used to override the "Samples" radio button name for Libraries
}

function SampleCategoryChooser({
	disabled, sampleCategory, onChange, samplesLabel
}: SampleCategoryChooserProps) {

	return (
		<Radio.Group disabled={disabled} value={sampleCategory} onChange={evt => {onChange(evt.target.value)}}>
         <Radio.Button value={SampleCategory.SAMPLES}> {samplesLabel ?? 'Samples'} </Radio.Button>
         <Radio.Button value={SampleCategory.POOLS}> Pools </Radio.Button>
         <Radio.Button value={SampleCategory.ALL}> All </Radio.Button>
      </Radio.Group>
	)
}

export default SampleCategoryChooser