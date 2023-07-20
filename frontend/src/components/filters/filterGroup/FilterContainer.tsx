import React from 'react'
import FilterLabel from './FilterLabel'

export const filterContainer: React.CSSProperties = {
	display: 'inline-flex',
	flexDirection: 'column',
	border: '1px solid #ddd',
	borderRadius: '2px',
	padding: '0.5rem',
	marginRight: '0.75rem',
	marginBottom: '0.75rem',
}

interface FilterInputProps extends React.PropsWithChildren {
	label: string
	width?: React.CSSProperties['width']
}

const FilterContainer = ({ label, width = 200, children }: FilterInputProps) => {
	return (
		<div style={{...filterContainer, width}}>
			<FilterLabel>{label}</FilterLabel>
			{ children }
		</div>
	)
}

export default FilterContainer
