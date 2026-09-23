import React, { useEffect, useState } from "react"
import { Card, Col, Progress, Row, Space, Statistic, Tooltip, Typography } from "antd"
import {
  CheckCircleOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  ExperimentOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { Column } from "@ant-design/charts"
import { FMSReadsetSummary } from "../../models/fms_api_models"
import api from "../../utils/api"
import { useAppDispatch } from "../../hooks"

const { Text } = Typography

const iconStyle = (color: string, backgroundColor: string): React.CSSProperties => ({
  color,
  backgroundColor,
  fontSize: 18,
  padding: 6,
  borderRadius: 8,
  marginRight: 4,
})

function ExternalIDReadSetDashboard({ parentProjectId }: { parentProjectId: number }) {
  const dispatch = useAppDispatch()
  const [summary, setSummary] = useState<FMSReadsetSummary>()

  useEffect(() => {
    dispatch(api.projectReadsets.summary({ dataset__project__parent_project__id__in: parentProjectId })).then((response) => {
      setSummary(response.data)
    })
  }, [dispatch, parentProjectId])

  return summary && (
    <div style={{ background: "#f5f7fb", padding: 0 }}>
      <Row gutter={[16, 16]} style={{ margin: 8, borderRadius: 4 }}>
        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              groupSeparator=" "
              title="Readsets"
              value={summary.total_readsets}
              prefix={<ExperimentOutlined style={iconStyle("#1677ff", "#e6f4ff")} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              groupSeparator=" "
              title="Runs"
              value={summary.total_runs}
              prefix={<ClusterOutlined style={iconStyle("#722ed1", "#f9f0ff")} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              groupSeparator=" "
              title="Samples"
              value={summary.total_samples}
              prefix={<TeamOutlined style={iconStyle("#13c2c2", "#e6fffb")} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic groupSeparator=" " title="Cohorts" value={summary.total_cohorts} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              title="Reads"
              value={`${(summary.nb_reads / 1_000_000_000).toFixed(1)} G`}
              prefix={<DatabaseOutlined style={iconStyle("#2f54eb", "#f0f5ff")} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              title="Avg Quality"
              value={summary.avg_qual}
              precision={1}
              prefix={<CheckCircleOutlined style={iconStyle("#2f54eb", "#f0f5ff")} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              title="Avg Alignment"
              value={summary.pf_read_alignment_rate * 100}
              precision={2}
              suffix={"%"}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6} xl={3}>
          <Card size="small" styles={{ body: { padding: "8px 12px" } }}>
            <Statistic
              title="Avg Duplication"
              value={summary.duplicate_rate * 100}
              precision={2}
              suffix={"%"}
            />
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
                <Card
                  size="small"
                  type="inner"
                  title="Library Type Distribution"
                  styles={{ body: { padding: 8 } }}
                >
                  <Column
                    height={120}
                    data={summary.library_type_distribution}
                    xField="type"
                    yField="count"
                    color="#3578ff"
                    label={{
                      position: "top",
                      style: {
                        fill: "#ffffff",
                        fontWeight: "bold",
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
                <Card
                  size="small"
                  type="inner"
                  title={
                    <Space size={4}>
                      <span>QC Completeness</span>
                      <Tooltip
                        color="#eef6ff"
                        styles={{ container: { color: "#1f2937" } }}
                        title="Shows the percentage of readsets with all required QC metrics available: average quality, PF reads aligned, and duplicate aligned."
                      >
                        <InfoCircleOutlined style={{ color: "#1677ff" }} />
                      </Tooltip>
                    </Space>
                  }
                >
                  <Space orientation="vertical" style={{ width: "100%" }} size={0}>
                    <Text>Complete QC Metrics</Text>
                    <Progress
                      size="small"
                      percent={summary.complete_count / summary.total_readsets * 100}
                      strokeColor="#2fbd5b"
                    />

                    <Text>Missing QC Metrics</Text>
                    <Progress
                      size="small"
                      percent={(summary.total_readsets - summary.complete_count) / summary.total_readsets * 100}
                      strokeColor="#faad14"
                    />
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
                    value={summary.pf_read_alignment_rate * 100}
                    precision={2}
                    suffix={"%"}
                    styles={{ content: { color: "#1677ff" } }}
                  />
                  <Progress
                    size="small"
                    percent={Number((summary.pf_read_alignment_rate * 100).toFixed(2))}
                    strokeColor={{ color: "#1677ff" }}
                    style={{ marginBottom: 52 }}
                  />
                  <Text type="secondary">{""}</Text>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card size="small" type="inner" title="Duplication rate">
                  <Statistic
                    value={summary.duplicate_rate * 100}
                    precision={2}
                    suffix={"%"}
                    styles={{ content: { color: "#1677ff" } }}
                  />
                  <Progress
                    size="small"
                    percent={Number((summary.duplicate_rate * 100).toFixed(2))}
                    strokeColor={{ color: "#1677ff" }}
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
