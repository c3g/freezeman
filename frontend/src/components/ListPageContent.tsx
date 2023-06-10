import React, { ReactNode } from 'react'

/*
	A page content component specifically for displaying tables (lists).
	This is for pages where the table is scrolled within the available area.

	It uses a flex column to render the page contents. A container (div)
	holding the table should have its flex-grow attribute set to 1, to take
	up all of the available space.
*/

export interface ListPageContentProps {
	children: ReactNode
}

function ListPageContent({children}: ListPageContentProps) {
	return (
		<div
			className={'list-page-content'}
			style={{
			flex: '1',
			display: 'flex',
			flexDirection: 'column',
			width: '100%',
			height: '100%',
			maxWidth: '100%',
			maxHeight: '100%',
			padding: "16px 24px 24px 24px",
		}}>
			{children}
		</div>
	)
}

export default ListPageContent