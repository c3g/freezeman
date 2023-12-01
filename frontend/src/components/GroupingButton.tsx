import { GroupOutlined } from "@ant-design/icons"
import { Button } from "antd"
import React from "react"

export interface GroupingButtonProps {
	onClick?: (grouping) => void
  selected: boolean
	refreshing: boolean
  grouping: string
	label: string
}

export default function GroupingButton({refreshing, selected, onClick, grouping, label}: GroupingButtonProps) {
	return (
		<Button
			icon={<GroupOutlined spin={refreshing}/>}
      type={selected ? 'primary' : 'default'}
			disabled={refreshing}
			onClick={() => {
				if (onClick) {
					onClick(grouping)
				}
			}}
		>
			{label}
		</Button>
	)
}