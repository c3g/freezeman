import React from 'react'
import FilterLabel from './FilterLabel'

export const filterContainer: React.CSSProperties = {
	display: 'inline-flex',
	flexDirection: 'column',
	border: '1px solid #ddd',
	borderRadius: '2px',
	padding: '0.5rem',
	// marginRight: '0.75rem',
	// marginBottom: '0.75rem',
}

interface FilterContainerProps extends React.PropsWithChildren {
	label: string
}

const FilterContainer = ({ label, children }: FilterContainerProps) => {
	return (
		<div style={{...filterContainer}}>
			<FilterLabel>{label}</FilterLabel>
			{ children }
		</div>
	)
}

export default FilterContainer
