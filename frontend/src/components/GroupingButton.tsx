import { GroupOutlined } from "@ant-design/icons"
import { Button } from "antd"
import React from "react"
import { FilterDescription } from '../models/paged_items'


export interface GroupingButtonProps {
	onClick?: (grouping) => void
  selected: boolean
	refreshing: boolean
  grouping: FilterDescription
}

export default function GroupingButton({refreshing, selected, onClick, grouping}: GroupingButtonProps) {
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
			{grouping.label}
		</Button>
	)
}