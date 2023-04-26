import { SyncOutlined } from "@ant-design/icons"
import { Button } from "antd"
import React from "react"

export interface RefreshButtonProps {
	onRefresh?: () => void
	refreshing: boolean
	label?: string
	title?: string
}

export default function RefreshButton({refreshing, onRefresh, label, title}: RefreshButtonProps) {
	return (
		<Button 
			icon={<SyncOutlined spin={refreshing}/>} 
			disabled={refreshing} 
			onClick={() => {
				if (onRefresh) {
					onRefresh()
				}
			}}
			title={title}
		>
			{label ? label : 'Refresh'}
		</Button>
	)
}