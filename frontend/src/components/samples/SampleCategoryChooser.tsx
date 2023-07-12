import { Radio } from 'antd'
import React from 'react'

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

interface SampleCategoryChooserProps {
	disabled: boolean
	value: SampleCategory
	onChange: (category: SampleCategory) => void
}

function SampleCategoryChooser({
	disabled, value, onChange
}: SampleCategoryChooserProps) {
	return (
		<Radio.Group disabled={disabled} value={value} onChange={evt => {onChange(evt.target.value)}}>
         <Radio.Button value={SampleCategory.SAMPLES}> Samples </Radio.Button>
         <Radio.Button value={SampleCategory.POOLS}> Pools </Radio.Button>
         <Radio.Button value={SampleCategory.ALL}> All </Radio.Button>
      </Radio.Group>
	)
}

export default SampleCategoryChooser