import React, { ReactNode } from 'react'

/*
	This component places a table and pagination controls on the page so that
	the table contents are displayed within a scrolling area and the pagination
	controls remain fixed at the bottom of the window.
*/
export interface PaginatedTableScrollerProps {
	table: ReactNode
	pagination: ReactNode
}

function PaginatedTableScroller({ table, pagination }: PaginatedTableScrollerProps) {
	return (
		<>
			{/* Create a div with flex:1 to take up the maximum available space in
				its parent component. The parent must be a flex box with column
				orientation for this to work (use ListPageContent).
			*/}
			<div style={{
				flex: 1,
				position: 'relative',
				height: '100%',
				maxHeight: '100%',
				display: 'flex',
				flexDirection: 'column',
			}}
			>
				{/* Put the table in an absolute positioned div. This stops the height and
					width of the table from determining the height and width of the page.
					
					This div uses flex to allocate the maximum vertical space to the table
					contents, while leaving the pagination section at the bottom of the box.
				*/}
				<div
					style={{
						position: 'absolute',
						display: 'flex',
						flexDirection: 'column',
						maxHeight: '100%',
						height: '100%',
						width: '100%',
						maxWidth: '100%',
					}}
				>
					{/* Have the table take up all available vertical space (flex 1)
						and have it scroll the table contents.

						The antd table supports vertical and horizontal scrolling, along
						with sticky headers, which would be perfect, but if we enable that
						then the table squishes itself horizontally to force the whole
						table to fit in the available width, and this makes the headers ugly.
					*/}
					<div
						style={{
							flex: '1',
							overflow: 'scroll',
							border: 'thin solid lightgray',
						}}
					>
						{table}
					</div>
					{pagination}
				</div>
			</div>
		</>
	)
}

export default PaginatedTableScroller
