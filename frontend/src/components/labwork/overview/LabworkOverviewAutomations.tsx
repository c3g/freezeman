import { Typography, List, Collapse } from 'antd'
import React from 'react'
import { LabworkSummary } from '../../../modules/labwork/models'
import LabworkOverviewStep from './LabworkOverviewStep'

const { Title } = Typography

interface LabworkAutomationsProps {
	summary: LabworkSummary,
	hideEmptySections: boolean
}

const LabworkOverviewAutomations = ({ summary, hideEmptySections}: LabworkAutomationsProps) => {
	
  let listData = summary.automations.steps
  const countAutomation = listData.reduce((acc, curr) => acc + curr.count, 0)
  const showPanel = !(!countAutomation && hideEmptySections)
	if (hideEmptySections) {
    listData = listData.filter(step => step.count > 0)
	}

	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
				<Title level={2}>Automations</Title>
			</div>
      <div style={{ padding: '1rem' }}>
        {showPanel && <Collapse items={[{
          key: "Automations",
          label: "Automations",
          extra: <Title level={4}>{countAutomation}</Title>,
          children: <List
            size="small"
            dataSource={listData}
            style={{ marginRight: '0.5rem' }}
            renderItem={(item) => (
              <List.Item>
                <LabworkOverviewStep step={item} />
              </List.Item>
            )}
          />
        }]} />}
      </div>
		</>
	)
}

export default LabworkOverviewAutomations