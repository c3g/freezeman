import React, { useMemo } from "react"
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons"
import { Card, Col, Row, Statistic, Tag } from "antd"

import { FMSProject } from "../../models/fms_api_models"

interface ExternalIDProjectsDashboardProps {
  data: FMSProject[]
}

const dashboardCardStyle: React.CSSProperties = {
  height: "100%",
  border: "1px solid #d9d9d9",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
}

const iconStyle = (color: string): React.CSSProperties => ({
  color,
  fontSize: 24,
  padding: 8,
  borderRadius: 8,
  background: `${color}15`,
})

const ExternalIDProjectsDashboard = ({ data }: ExternalIDProjectsDashboardProps) => {
  const total = data.length

  const openCount = useMemo(() => data.filter((project) => project.status === "Open").length, [data])

  const uniquePIs = useMemo(() => new Set(data.map((project) => project.principal_investigator).filter(Boolean)).size, [data])

  const uniqueRequestors = useMemo(() => new Set(data.map((project) => project.requestor_name).filter(Boolean)).size, [data])

  return (
    <Row gutter={[16, 16]} justify="center" style={{ margin: "12px 0" }}>
      <Col xs={24} sm={12} md={6}>
        <Card size="small" style={dashboardCardStyle}>
          <Statistic
            title="Total Projects"
            value={total}
            prefix={<FolderOpenOutlined style={iconStyle("#1677ff")} />}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card size="small" style={dashboardCardStyle}>
          <Statistic
            title="Open Projects"
            value={openCount}
            prefix={<CheckCircleOutlined style={iconStyle("#52c41a")} />}
            suffix={<Tag color="green">Open</Tag>}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card size="small" style={dashboardCardStyle}>
          <Statistic
            title="Principal Investigators"
            value={uniquePIs}
            prefix={<TeamOutlined style={iconStyle("#722ed1")} />}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card size="small" style={dashboardCardStyle}>
          <Statistic
            title="Requestors"
            value={uniqueRequestors}
            prefix={<UserOutlined style={iconStyle("#fa8c16")} />}
          />
        </Card>
      </Col>
    </Row>
  )
}

export default ExternalIDProjectsDashboard
