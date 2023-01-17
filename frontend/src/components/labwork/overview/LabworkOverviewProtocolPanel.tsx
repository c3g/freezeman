import React from 'react'
import { Card, Collapse, Typography } from 'antd'
import { LabworkSummaryProtocol, LabworkSummaryStep } from './LabworkModels'
import LabworkOverviewStep from './LabworkOverviewStep'
import { number } from 'prop-types'


const { Panel } = Collapse

export interface LabworkProtocolPanelProps {
	readonly protocol: LabworkSummaryProtocol
}

interface GroupedSteps {
	groupId?: number
	groupName?: string
	steps: LabworkSummaryStep[]
}

const LabworkOverviewProtocolPanel = ({protocol} : LabworkProtocolPanelProps) => {
	

	function groupSteps(protocol: LabworkSummaryProtocol) : GroupedSteps[] {
		// Sort the steps into their groups, if any.
		// Group zero collects any steps for which no group is defined.
		const groupMap = new Map<number, GroupedSteps>()
		groupMap.set(0, {steps: []})
		for(const grouping of protocol.groups) {
			groupMap.set(grouping.id, {groupId: grouping.id, groupName: grouping.group_name, steps: []})
		}
		for(const step of protocol.steps) {
			let group = groupMap.get(0)
			if (step.group && groupMap.has(step.group)) {
				group = groupMap.get(step.group)
			}
			if (group) {
				group.steps.push(step)
			}
		}
		return [...groupMap.values()]
	}

	const groups = groupSteps(protocol)

	return (
		<>
			{
				groups.map(group => {
					if (group.steps.length > 0) {
						if (group.groupId && group.groupName) {
							return (
								<>
									<Card size='small'><Typography.Title level={5}>{group.groupName}</Typography.Title></Card>
									{group.steps.map(step => <LabworkOverviewStep key={step.name} step={step}/>)}
								</>
							)
						} else {
							return (group.steps.map(step => <LabworkOverviewStep key={step.name} step={step}/>))
						}
					}
				})
			}
		</>
	)
}

export default LabworkOverviewProtocolPanel