import React, { CSSProperties, useMemo } from 'react'
import {
  Alert,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  ProjectOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Bar, Column, Line, Pie } from '@ant-design/plots'

import { Library } from '../../models/frontend_models'

const { Title, Text } = Typography

type LibraryStatus =
  | 'ready'
  | 'review'
  | 'blocked'
  | 'incomplete'

type NormalizedFlag =
  | 'passed'
  | 'warning'
  | 'failed'
  | 'not_evaluated'

type KpiTone =
  | 'blue'
  | 'purple'
  | 'cyan'
  | 'geekblue'
  | 'green'
  | 'gold'
  | 'red'
  | 'gray'

type StatusData = {
  status: LibraryStatus
  label: string
  value: number
}

type ProjectData = {
  project: string
  total: number
  ready: number
  attention: number
}

type TrendData = {
  period: string
  count: number
  cumulative: number
}

type QualityData = {
  category: string
  status: NormalizedFlag
  value: number
}

type KpiCardProps = {
  title: string
  value: number
  icon: React.ReactNode
  tone: KpiTone
  description: string
}

type DashboardCardProps = {
  title: string
  subtitle: string
  children: React.ReactNode
}

const styles: Record<string, CSSProperties> = {
  dashboard: {
    minHeight: '100%',
    padding: 24,
    background: '#f5f7fa',
  },

  dashboardHeader: {
    marginBottom: 20,
  },

  dashboardTitle: {
    margin: '0 0 4px',
  },

  alert: {
    marginBottom: 16,
    borderRadius: 10,
  },

  kpiSection: {
    marginBottom: 16,
  },

  kpiCard: {
    height: '100%',
    border: '1px solid #eaecf0',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(16, 24, 40, 0.04)',
  },

  kpiIcon: {
    display: 'grid',
    width: 44,
    minWidth: 44,
    height: 44,
    placeItems: 'center',
    borderRadius: 11,
    fontSize: 20,
  },

  kpiDescription: {
    display: 'block',
    marginTop: 4,
    fontSize: 12,
  },

  chartCard: {
    height: '100%',
    marginBottom: 16,
    border: '1px solid #eaecf0',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(16, 24, 40, 0.04)',
  },

  chartTitle: {
    fontSize: 15,
  },

  chartSubtitle: {
    fontSize: 12,
    fontWeight: 400,
  },

  chartEmpty: {
    height: 300,
    gap: 12,
    fontSize: 32,
  },

  tableCard: {
    marginTop: 0,
    border: '1px solid #eaecf0',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(16, 24, 40, 0.04)',
    overflow: 'hidden',
  },
}

const kpiToneStyles: Record<KpiTone, CSSProperties> = {
  blue: {
    color: '#1677ff',
    background: '#e6f4ff',
  },

  purple: {
    color: '#722ed1',
    background: '#f9f0ff',
  },

  cyan: {
    color: '#08979c',
    background: '#e6fffb',
  },

  geekblue: {
    color: '#2f54eb',
    background: '#f0f5ff',
  },

  green: {
    color: '#389e0d',
    background: '#f6ffed',
  },

  gold: {
    color: '#d48806',
    background: '#fffbe6',
  },

  red: {
    color: '#cf1322',
    background: '#fff1f0',
  },

  gray: {
    color: '#595959',
    background: '#f5f5f5',
  },
}

const statusLabels: Record<LibraryStatus, string> = {
  ready: 'Prêtes',
  review: 'À vérifier',
  blocked: 'Bloquées',
  incomplete: 'Incomplètes',
}

const statusColors: Record<LibraryStatus, string> = {
  ready: '#52c41a',
  review: '#faad14',
  blocked: '#ff4d4f',
  incomplete: '#8c8c8c',
}

const qualityColors: Record<NormalizedFlag, string> = {
  passed: '#52c41a',
  warning: '#faad14',
  failed: '#ff4d4f',
  not_evaluated: '#bfbfbf',
}

const qualityLabels: Record<NormalizedFlag, string> = {
  passed: 'Conforme',
  warning: 'À vérifier',
  failed: 'Échec',
  not_evaluated: 'Non évalué',
}

const normalizeFlag = (
  value?: boolean | null,
): NormalizedFlag => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase()

  if (
    [
      'passed',
      'pass',
      'success',
      'valid',
      'ok',
    ].includes(normalizedValue)
  ) {
    return 'passed'
  }

  if (
    [
      'warning',
      'warn',
      'review',
      'needs_review',
    ].includes(normalizedValue)
  ) {
    return 'warning'
  }

  if (
    [
      'failed',
      'fail',
      'error',
      'blocked',
    ].includes(normalizedValue)
  ) {
    return 'failed'
  }

  return 'not_evaluated'
}

const getLibraryStatus = (
  library: Library,
): LibraryStatus => {
  const flags = [
    normalizeFlag(library.quality_flag),
    normalizeFlag(library.quantity_flag),
    normalizeFlag(library.identity_flag),
  ]

  if (flags.includes('failed')) {
    return 'blocked'
  }

  if (flags.includes('warning')) {
    return 'review'
  }

  const hasMissingRequiredData =
    library.concentration == null ||
    library.quantity_ng == null ||
    library.library_size == null

  if (hasMissingRequiredData) {
    return 'incomplete'
  }

  return 'ready'
}

const formatDate = (
  value?: string | null,
): string => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const getPeriodKey = (
  value?: string | null,
): string | null => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  return `${year}-${month}`
}

const calculatePercentage = (
  value: number,
  total: number,
): number => {
  if (total === 0) {
    return 0
  }

  return Math.round((value / total) * 100)
}

const getStatusTag = (
  status: LibraryStatus,
) => {
  const colors: Record<
    LibraryStatus,
    'success' | 'warning' | 'error' | 'default'
  > = {
    ready: 'success',
    review: 'warning',
    blocked: 'error',
    incomplete: 'default',
  }

  return (
    <Tag color={colors[status]}>
      {statusLabels[status]}
    </Tag>
  )
}

const getKpiIconStyle = (
  tone: KpiTone,
): CSSProperties => ({
  ...styles.kpiIcon,
  ...kpiToneStyles[tone],
})

function ExternalIDReadSetDashboard({
  libraries,
}: {
  libraries: Library[]
}) {
  const dashboardData = useMemo(() => {
    const statuses = libraries.map(
      getLibraryStatus,
    )

    const ready = statuses.filter(
      (status) => status === 'ready',
    ).length

    const review = statuses.filter(
      (status) => status === 'review',
    ).length

    const blocked = statuses.filter(
      (status) => status === 'blocked',
    ).length

    const incomplete = statuses.filter(
      (status) => status === 'incomplete',
    ).length

    const uniqueBiosamples = new Set(
      libraries
        .map((library) => library.biosample_id)
        .filter(Boolean),
    ).size

    const projects = new Set(
      libraries
        .map((library) => library.project)
        .filter(Boolean),
    ).size

    const pools = libraries.filter(
      (library) => library.is_pool,
    ).length

    const validCreationDates = libraries
      .map((library) => library.creation_date)
      .filter(
        (date): date is string =>
          Boolean(date) &&
          !Number.isNaN(
            new Date(date as string).getTime(),
          ),
      )
      .sort(
        (dateA, dateB) =>
          new Date(dateB).getTime() -
          new Date(dateA).getTime(),
      )

    return {
      total: libraries.length,
      uniqueBiosamples,
      projects,
      pools,
      ready,
      review,
      blocked,
      incomplete,

      completionRate: calculatePercentage(
        ready,
        libraries.length,
      ),

      lastActivity:
        validCreationDates[0] ?? null,
    }
  }, [libraries])

  const statusData = useMemo<StatusData[]>(
    () => [
      {
        status: 'ready',
        label: statusLabels.ready,
        value: dashboardData.ready,
      },
      {
        status: 'review',
        label: statusLabels.review,
        value: dashboardData.review,
      },
      {
        status: 'blocked',
        label: statusLabels.blocked,
        value: dashboardData.blocked,
      },
      {
        status: 'incomplete',
        label: statusLabels.incomplete,
        value: dashboardData.incomplete,
      },
    ],
    [dashboardData],
  )

  const trendData = useMemo<TrendData[]>(() => {
    const periodCounts = new Map<
      string,
      number
    >()

    libraries.forEach((library) => {
      const period = getPeriodKey(
        library.creation_date,
      )

      if (!period) {
        return
      }

      periodCounts.set(
        period,
        (periodCounts.get(period) ?? 0) + 1,
      )
    })

    let cumulative = 0

    return Array.from(periodCounts.entries())
      .sort(([periodA], [periodB]) =>
        periodA.localeCompare(periodB),
      )
      .map(([period, count]) => {
        cumulative += count

        return {
          period,
          count,
          cumulative,
        }
      })
  }, [libraries])

  const projectData = useMemo<ProjectData[]>(() => {
    const projects = new Map<
      string,
      ProjectData
    >()

    libraries.forEach((library) => {
      const project =
        String(
          library.project ?? '',
        ).trim() || 'Projet non renseigné'

      const currentProject =
        projects.get(project) ?? {
          project,
          total: 0,
          ready: 0,
          attention: 0,
        }

      const status =
        getLibraryStatus(library)

      currentProject.total += 1

      if (status === 'ready') {
        currentProject.ready += 1
      } else {
        currentProject.attention += 1
      }

      projects.set(
        project,
        currentProject,
      )
    })

    return Array.from(projects.values())
      .sort(
        (projectA, projectB) =>
          projectB.total - projectA.total,
      )
      .slice(0, 10)
  }, [libraries])

  const libraryTypeData = useMemo(() => {
    const types = new Map<string, number>()

    libraries.forEach((library) => {
      const type =
        String(
          library.library_type ?? '',
        ).trim() || 'Non renseigné'

      types.set(
        type,
        (types.get(type) ?? 0) + 1,
      )
    })

    return Array.from(types.entries())
      .map(([type, value]) => ({
        type,
        value,
      }))
      .sort(
        (typeA, typeB) =>
          typeB.value - typeA.value,
      )
      .slice(0, 10)
  }, [libraries])

  const qualityData = useMemo<QualityData[]>(
    () => {
      const qualityDimensions = [
        {
          category: 'Qualité',
          getValue: (library: Library) =>
            library.quality_flag,
        },
        {
          category: 'Quantité',
          getValue: (library: Library) =>
            library.quantity_flag,
        },
        {
          category: 'Identité',
          getValue: (library: Library) =>
            library.identity_flag,
        },
      ]

      return qualityDimensions.flatMap(
        ({ category, getValue }) => {
          const counts: Record<
            NormalizedFlag,
            number
          > = {
            passed: 0,
            warning: 0,
            failed: 0,
            not_evaluated: 0,
          }

          libraries.forEach((library) => {
            const status = normalizeFlag(
              getValue(library),
            )

            counts[status] += 1
          })

          return (
            Object.entries(counts) as [
              NormalizedFlag,
              number,
            ][]
          ).map(([status, value]) => ({
            category,
            status,
            value,
          }))
        },
      )
    },
    [libraries],
  )

  const attentionLibraries = useMemo(
    () =>
      libraries
        .filter(
          (library) =>
            getLibraryStatus(library) !==
            'ready',
        )
        .sort((libraryA, libraryB) => {
          const priority: Record<
            LibraryStatus,
            number
          > = {
            blocked: 0,
            review: 1,
            incomplete: 2,
            ready: 3,
          }

          return (
            priority[
              getLibraryStatus(libraryA)
            ] -
            priority[
              getLibraryStatus(libraryB)
            ]
          )
        }),
    [libraries],
  )

  if (libraries.length === 0) {
    return (
      <Card
        style={styles.tableCard}
        styles={{
          body: {
            padding: 32,
          },
        }}
      >
        <Empty description="Aucune library disponible" />
      </Card>
    )
  }

  return (
    <div style={styles.dashboard}>
     

      {dashboardData.blocked > 0 && (
        <Alert
          showIcon
          type="error"
          style={styles.alert}
          message={`${dashboardData.blocked} library(s) bloquée(s) nécessitent une action.`}
        />
      )}

      {/* Deux lignes de quatre KPI */}
      <Row
        gutter={[16, 16]}
        style={styles.kpiSection}
      >
        <KpiCard
          title="Libraries totales"
          value={dashboardData.total}
          icon={<DatabaseOutlined />}
          tone="blue"
          description="Périmètre global"
        />

        <KpiCard
          title="Biosamples couverts"
          value={
            dashboardData.uniqueBiosamples
          }
          icon={<TeamOutlined />}
          tone="purple"
          description="Échantillons uniques"
        />

        <KpiCard
          title="Pools créés"
          value={dashboardData.pools}
          icon={<ExperimentOutlined />}
          tone="geekblue"
          description={`${calculatePercentage(
            dashboardData.pools,
            dashboardData.total,
          )}% des libraries`}
        />

        <KpiCard
          title="Prêtes"
          value={dashboardData.ready}
          icon={<CheckCircleOutlined />}
          tone="green"
          description={`${dashboardData.completionRate}% du total`}
        />

        <KpiCard
          title="À vérifier"
          value={dashboardData.review}
          icon={<WarningOutlined />}
          tone="gold"
          description="Action de validation"
        />

        <KpiCard
          title="Bloquées"
          value={dashboardData.blocked}
          icon={<CloseCircleOutlined />}
          tone="red"
          description="Action prioritaire"
        />

        <KpiCard
          title="Incomplètes"
          value={dashboardData.incomplete}
          icon={<ClockCircleOutlined />}
          tone="gray"
          description="Informations manquantes"
        />
      </Row>

      <Row gutter={[16, 16]}>


        <Col xs={24} xl={6}>
          <DashboardCard
            title="État global"
            subtitle="Niveau de préparation des libraries"
          >
            <Pie
              height={220}
              data={statusData}
              angleField="value"
              colorField="status"
              innerRadius={0.68}
              scale={{
                color: {
                  domain: [
                    'ready',
                    'review',
                    'blocked',
                    'incomplete',
                  ],
                  range: [
                    statusColors.ready,
                    statusColors.review,
                    statusColors.blocked,
                    statusColors.incomplete,
                  ],
                },
              }}
              label={{
                text: 'value',
                position: 'outside',
              }}
              legend={{
                color: {
                  position: 'bottom',
                },
              }}
              annotations={[
                {
                  type: 'text',
                  style: {
                    text: `${dashboardData.completionRate}%\nprêtes`,
                    x: '50%',
                    y: '50%',
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                  },
                },
              ]}
              tooltip={{
                items: [
                  {
                    field: 'label',
                    name: 'Statut',
                  },
                  {
                    field: 'value',
                    name: 'Libraries',
                  },
                ],
              }}
            />
          </DashboardCard>
        </Col>

        <Col xs={24} xl={9}>
          <DashboardCard
            title="Charge par projet"
            subtitle="Top 10 des projets par nombre de libraries"
          >
            {projectData.length > 0 ? (
              <Bar
                height={220}
                data={projectData}
                xField="total"
                yField="project"
                label={{
                  text: 'total',
                  position: 'right',
                }}
                axis={{
                  x: {
                    title:
                      'Nombre de libraries',
                  },
                  y: {
                    title: false,
                  },
                }}
                tooltip={{
                  items: [
                    {
                      field: 'total',
                      name: 'Total',
                    },
                    {
                      field: 'ready',
                      name: 'Prêtes',
                    },
                    {
                      field: 'attention',
                      name: 'À traiter',
                    },
                  ],
                }}
              />
            ) : (
              <ChartEmpty />
            )}
          </DashboardCard>
        </Col>

  <Col xs={24} xl={9}>
          <DashboardCard
            title="Composition des libraries"
            subtitle="Répartition par type de library"
          >
            {libraryTypeData.length > 0 ? (
              <Column
                height={220}
                data={libraryTypeData}
                xField="type"
                yField="value"
                label={{
                  text: 'value',
                  position: 'top',
                }}
                axis={{
                  x: {
                    title: false,
                    labelAutoRotate: true,
                  },
                  y: {
                    title:
                      'Nombre de libraries',
                  },
                }}
              />
            ) : (
              <ChartEmpty />
            )}
          </DashboardCard>
        </Col>
      
      </Row>

    </div>
  )
}

function KpiCard({
  title,
  value,
  icon,
  tone,
  description,
}: KpiCardProps) {
  return (
  <Col xs={24} sm={12} md={6} lg={3}>
      <Card
        style={styles.kpiCard}
        styles={{
          body: {
            padding: '5px  7px',
          },
        }}
      >
        <Flex
          justify="space-between"
          align="flex-start"
          gap={16}
        >
          <div>
            <Statistic
              title={title}
              value={value}
              groupSeparator=" "
              valueStyle={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            />

            <Text
              type="secondary"
              style={
                styles.kpiDescription
              }
            >
              {description}
            </Text>
          </div>

          <div
            style={getKpiIconStyle(
              tone,
            )}
          >
            {icon}
          </div>
        </Flex>
      </Card>
    </Col>
  )
}

function DashboardCard({
  title,
  subtitle,
  children,
}: DashboardCardProps) {
  return (
    <Card
      style={styles.chartCard}
      title={
        <Flex vertical gap={2}>
          <Text
            strong
            style={styles.chartTitle}
          >
            {title}
          </Text>

          <Text
            type="secondary"
            style={styles.chartSubtitle}
          >
            {subtitle}
          </Text>
        </Flex>
      }
      styles={{
        header: {
          minHeight: 62,
        },
        body: {
          padding: 10,
        },
      }}
    >
      {children}
    </Card>
  )
}

function ChartEmpty() {
  return (
    <Flex
      vertical
      justify="center"
      align="center"
      style={styles.chartEmpty}
    >
      <AppstoreOutlined />

      <Text type="secondary">
        Données insuffisantes
      </Text>
    </Flex>
  )
}

export default ExternalIDReadSetDashboard