import React from 'react'

import { Card, Col, Progress, Row, Space, Statistic, Tag } from 'antd'
import { CheckCircleOutlined, DatabaseOutlined, ExperimentOutlined, FileSearchOutlined, WarningOutlined } from '@ant-design/icons'
import { ExternalIDProjectSamplesSummary } from './types'

const CARD_BODY_STYLE = { padding: 12 }
const CARD_HEAD_STYLE = { minHeight: 36, padding: '0 12px' }

const KpiCard = ({
	title,
	value,
	suffix,
	precision,
	icon,
	color,
}: {
	title: string
	value: number
	suffix?: string
	precision?: number
	icon?: React.ReactNode
	color?: string
}) => (
	<Card size="small" styles={{ body: CARD_BODY_STYLE }}>
		<Statistic
			title={title}
			value={value}
			suffix={suffix}
			precision={precision}
			prefix={icon}
			valueStyle={{ fontSize: 20, ...(color ? { color } : {}) }}
		/>
	</Card>
)

const ExternalIDSamplesDashboard = ({ summary }: { summary: ExternalIDProjectSamplesSummary }) => {
	return (
		<Space direction="vertical" size={8} style={{ width: '100%', margin: 12 }}>
			<Row gutter={[8, 8]}>
				<Col xs={12} md={6}>
					<KpiCard title="Total Samples" value={summary.total_samples} icon={<ExperimentOutlined />} />
				</Col>

				<Col xs={12} md={6}>
					<KpiCard title="QC Passed" value={summary.qc_passed_count} icon={<CheckCircleOutlined />} color="#3f8600" />
				</Col>

				<Col xs={12} md={6}>
					<KpiCard title="QC Review" value={summary.qc_review_count} icon={<WarningOutlined />} color="#cf1322" />
				</Col>

				<Col xs={12} md={6}>
					<KpiCard title="Missing QC" value={summary.missing_qc_count} icon={<FileSearchOutlined />} color="#faad14" />
				</Col>
			</Row>

			<Row gutter={[8, 8]}>
				<Col xs={24} lg={8}>
					<Card size="small" title="Process Coverage" styles={{ header: CARD_HEAD_STYLE, body: CARD_BODY_STYLE }}>
						<Progress percent={Number(summary.process_coverage_percent.toFixed(1))} size="small" />
						<Space wrap size={4} style={{ paddingBottom: 8 }}>
							<Tag color="green">With Process: {summary.with_process_count}</Tag>
							<Tag color="orange">Without Process: {summary.without_process_count}</Tag>
						</Space>
					</Card>
				</Col>

				<Col xs={24} lg={8}>
					<Card size="small" title="Quantity & Concentration" styles={{ header: CARD_HEAD_STYLE, body: CARD_BODY_STYLE }}>
						<Row gutter={[8, 8]}>
							<Col span={12}>
								<Statistic
									title="Total Quantity"
									value={summary.total_quantity}
									precision={1}
									suffix="ng"
									prefix={<DatabaseOutlined />}
									valueStyle={{ fontSize: 18 }}
								/>
							</Col>

							<Col span={12}>
								<Statistic
									title="Avg Concentration"
									value={summary.avg_concentration ?? 0}
									precision={2}
									suffix="ng/uL"
									valueStyle={{ fontSize: 18 }}
								/>
							</Col>
						</Row>
					</Card>
				</Col>

				<Col xs={24} lg={8}>
					<Card size="small" title="Sequencing Reads" styles={{ header: CARD_HEAD_STYLE, body: CARD_BODY_STYLE }}>
						<Row gutter={[8, 8]}>
							<Col span={12}>
								<Statistic title="Total Reads" value={summary.total_reads} valueStyle={{ fontSize: 18 }} />
							</Col>

							<Col span={12}>
								<Statistic
									title="Avg Reads / Sample"
									value={summary.avg_reads_per_sample}
									precision={0}
									valueStyle={{ fontSize: 18 }}
								/>
							</Col>
						</Row>
					</Card>
				</Col>
			</Row>
		</Space>
	)
}

export default ExternalIDSamplesDashboard
