import React from 'react'
import { FolderOpenOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { Card, Col, Row, Statistic, Tag } from 'antd'

import { Project } from '../../models/frontend_models'

interface ExternalIDProjectsDashboardProps {
	data: Project[]
}

const dashboardCardStyle: React.CSSProperties = {
	height: '100%',
	border: '1px solid #d9d9d9',
	boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
}

const ExternalIDProjectsDashboard = ({ data }: ExternalIDProjectsDashboardProps) => {
	const total = data.length

	const openCount = data.filter((project) => project.status === 'Open').length

	const uniquePIs = new Set(data.map((project) => project.principal_investigator).filter(Boolean)).size

	const uniqueRequestors = new Set(data.map((project) => project.requestor_name).filter(Boolean)).size

	return (
		<Row gutter={[16, 16]} justify="center" style={{ margin: '12px 0' }}>
			<Col xs={24} sm={12} md={6}>
				<Card size="small" style={dashboardCardStyle}>
					<Statistic title="Total Projects" value={total} prefix={<FolderOpenOutlined />} />
				</Card>
			</Col>

			<Col xs={24} sm={12} md={6}>
				<Card size="small" style={dashboardCardStyle}>
					<Statistic title="Open Projects" value={openCount} suffix={<Tag color="green">Open</Tag>} />
				</Card>
			</Col>

			<Col xs={24} sm={12} md={6}>
				<Card size="small" style={dashboardCardStyle}>
					<Statistic title="Principal Investigators" value={uniquePIs} prefix={<TeamOutlined />} />
				</Card>
			</Col>

			<Col xs={24} sm={12} md={6}>
				<Card size="small" style={dashboardCardStyle}>
					<Statistic title="Requestors" value={uniqueRequestors} prefix={<UserOutlined />} />
				</Card>
			</Col>
		</Row>
	)
}

export default ExternalIDProjectsDashboard
