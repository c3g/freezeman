import React from 'react'
import { Select } from 'antd'
import { ObjectId, ReferenceGenome } from '../../models/frontend_models'
import { useSelector } from 'react-redux'
import { selectReferenceGenomesByID } from '../../selectors'
import { DefaultOptionType } from 'antd/lib/select'

interface ReferenceGenomeSelectProps {
	selectedReferenceGenomeId?: ObjectId
	onChange?: (referenceGenome: ReferenceGenome) => void
}

/**
 * Creates a reference genome Select menu, for use as with an antd Form.Item.
 *
 * The onChange callback is called whenever the user selects a reference genome, with the
 * selected reference genome as a parameter. Ant Design uses onChange to collect the selected
 * value for the form data.
 *
 * @param selectedReferenceGenomeId : ObjectId  The id of a reference genome, or undefined
 * @param onChange: onChange callback function that receives a selected ReferenceGenome object as a parameter
 * @returns
 */
const ReferenceGenomeSelect = ({ selectedReferenceGenomeId, onChange }: ReferenceGenomeSelectProps) => {
	const referenceGenomes = Object.values(useSelector(selectReferenceGenomesByID) ?? {}) as ReferenceGenome[]

	function handleChange(referenceGenomeId: ObjectId) {
		const selectedReference = referenceGenomes.find((rg) => rg.id === referenceGenomeId)
		if (selectedReference && onChange) {
			onChange(selectedReference)
		}
	}

	const options: DefaultOptionType[] = referenceGenomes.map((rg) => {
		return {
			value: rg.id,
			label: `${rg.assembly_name}${rg.synonym ? ` (${rg.synonym})` : ''}`,
		}
	})

	return (
		<>
			<Select defaultValue={selectedReferenceGenomeId} options={options} onChange={handleChange} />
		</>
	)
}

export default ReferenceGenomeSelect
