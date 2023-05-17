import React, { PropsWithChildren } from "react"

interface FlexBarProps extends PropsWithChildren<object> {
    style?: React.CSSProperties
}

export default function FlexBar({children, style}: FlexBarProps) {
	// Displays children in a horizontal flexbox, maximizing the space between the children.
	// Two children will appear at the left and right ends of the bar with whitespace in between.
	return (
		<div style={{display: 'flex', justifyContent: 'space-between', padding: '1em', ...style}}>
			{children}
		</div>
	)
}