import React, { useMemo } from 'react'
import { Card, Col, Progress, Row, Space, Statistic, Typography } from 'antd'
import { CheckCircleOutlined, ClusterOutlined, DatabaseOutlined, ExperimentOutlined, TeamOutlined } from '@ant-design/icons'
import { Column } from '@ant-design/charts'
import { ProjectOverviewReadset } from './types'

const { Text } = Typography

const getQcCompletenessData = (items: ProjectOverviewReadset[]) => {
	const total = items.length || 1

	const complete = items.filter((item) => {
		return (
			item.average_quality !== null &&
			item.average_quality !== undefined &&
			item.pf_reads_aligned !== null &&
			item.pf_reads_aligned !== undefined &&
			item.duplicate_aligned !== null &&
			item.duplicate_aligned !== undefined
		)
	}).length

	const incomplete = items.length - complete

	return {
		complete: Math.round((complete / total) * 100),
		incomplete: Math.round((incomplete / total) * 100),
		completeCount: complete,
		incompleteCount: incomplete,
	}
}

function ExternalIDReadSetDashboard({ readsets }: { readsets: ProjectOverviewReadset[] }) {
	const metrics = useMemo(() => {
		const total = readsets.length || 1

		return {
			totalReadsets: readsets.length,
			totalReads: readsets.reduce((sum, x) => sum + Number(x.number_of_reads || 0), 0),
			totalRuns: new Set(readsets.map((x) => x.run_name)).size,
			totalSamples: new Set(readsets.map((x) => x.readset_sample_name)).size,
			totalCohorts: new Set(readsets.map((x) => x.cohort)).size,
			avgQuality: readsets.reduce((sum, x) => sum + Number(x.average_quality), 0) / total,
			avgAlignment: readsets.reduce((sum, x) => sum + Number(x.pf_reads_aligned), 0) / total,
			avgDuplication: readsets.reduce((sum, x) => sum + Number(x.duplicate_aligned), 0) / total,
		}
	}, [readsets])

	const qcCompleteness = useMemo(() => getQcCompletenessData(readsets), [readsets])

	const libraryTypeData = useMemo(() => {
		const grouped = new Map<string, number>()

		readsets.forEach((item) => {
			const libraryType = item.library_type?.trim() || 'Non renseigné'

			grouped.set(libraryType, (grouped.get(libraryType) || 0) + 1)
		})

		return Array.from(grouped.entries()).map(([libraryType, count]) => ({
			libraryType,
			count,
		}))
	}, [readsets])

	return (
		<div style={{ background: '#f5f7fb', padding: 0 }}>
			<Row gutter={[16, 16]} style={{ margin: 8, borderRadius: 4 }}>
				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Readsets" value={metrics.totalReadsets} prefix={<ExperimentOutlined />} />
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Runs" value={metrics.totalRuns} prefix={<ClusterOutlined />} />
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Samples" value={metrics.totalSamples} prefix={<TeamOutlined />} />
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Cohortes" value={metrics.totalCohorts} />
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic
							title="Reads"
							value={`${(metrics.totalReads / 1_000_000_000).toFixed(1)} G`}
							prefix={<DatabaseOutlined />}
						/>
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Avg Quality" value={metrics.avgQuality} precision={1} prefix={<CheckCircleOutlined />} />
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Avg Alignment" value={metrics.avgAlignment * 100} precision={2} suffix="%" />
					</Card>
				</Col>

				<Col xs={24} sm={12} lg={6} xl={3}>
					<Card size="small" styles={{ body: { padding: '8px 12px' } }}>
						<Statistic title="Avg Duplication" value={metrics.avgDuplication * 100} precision={2} suffix="%" />
					</Card>
				</Col>
			</Row>

			<Row gutter={[16, 16]} style={{ margin: 8 }}>
				<Col xs={24} xl={12}>
					<Card
						size="small"
						title={
							<Space>
								<ClusterOutlined />
								<span>Run Statistics</span>
							</Space>
						}
					>
						<Row gutter={[12, 12]}>
							<Col xs={24} lg={12}>
								<Card size="small" type="inner" title="Library Type Distribution" bodyStyle={{ padding: 8 }}>
									<Column
										height={120}
										data={libraryTypeData}
										xField="libraryType"
										yField="count"
										color="#3578ff"
										label={{
											position: 'top',
											style: {
												fill: '#ffffff',
												fontWeight: 'bold',
												fontSize: 12,
											},
										}}
										xAxis={{
											title: null,
										}}
										yAxis={{
											title: null,
											minInterval: 1,
										}}
									/>
								</Card>
							</Col>

							<Col xs={24} lg={12}>
								<Card size="small" type="inner" title="QC Completeness">
									<Space direction="vertical" style={{ width: '100%' }} size={0}>
										<Text>Complete QC Metrics</Text>
										<Progress size="small" percent={qcCompleteness.complete} strokeColor="#2fbd5b" />

										<Text>Missing QC Metrics</Text>
										<Progress size="small" percent={qcCompleteness.incomplete} strokeColor="#faad14" />

										<Text type="secondary">
											{qcCompleteness.completeCount} / {readsets.length} fully usable readsets
										</Text>
									</Space>
								</Card>
							</Col>
						</Row>
					</Card>
				</Col>

				<Col xs={24} xl={12}>
					<Card
						size="small"
						title={
							<Space>
								<CheckCircleOutlined />
								<span>Quality Statistics</span>
							</Space>
						}
					>
						<Row gutter={[12, 12]}>
							<Col xs={24} lg={12}>
								<Card size="small" type="inner" title="Alignement rate">
									<Statistic
										value={metrics.avgAlignment * 100}
										precision={2}
										suffix="%"
										valueStyle={{ color: '#1677ff' }}
									/>
									<Progress
										size="small"
										percent={Number((metrics.avgAlignment * 100).toFixed(2))}
										strokeColor={{ color: '#1677ff' }}
										style={{ marginBottom: 52 }}
									/>
									<Text type="secondary">{''}</Text>
								</Card>
							</Col>

							<Col xs={24} lg={12}>
								<Card size="small" type="inner" title="Duplication rate">
									<Statistic
										value={metrics.avgDuplication * 100}
										precision={2}
										suffix="%"
										valueStyle={{
											color: '#1677ff',
										}}
									/>
									<Progress
										size="small"
										percent={Number((metrics.avgDuplication * 100).toFixed(2))}
										strokeColor={{ color: '#1677ff' }}
										style={{ marginBottom: 52 }}
									/>
									<Text type="secondary"></Text>
								</Card>
							</Col>
						</Row>
					</Card>
				</Col>
			</Row>
		</div>
	)
}

export default ExternalIDReadSetDashboard
