import React, { CSSProperties, useMemo } from 'react'
import {Alert,Card,Col,Empty,Flex,Statistic,Tag,Typography,} from 'antd'
import {AppstoreOutlined,BarcodeOutlined,CheckCircleOutlined,ClockCircleOutlined,DatabaseOutlined,ExperimentOutlined,TeamOutlined,WarningOutlined,} from '@ant-design/icons'
import { Column} from '@ant-design/plots'

import { Library } from '../../models/frontend_models'

const { Text } = Typography

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
    padding: 4,
    background: '#f5f7fa',
  },

 
  alert: {
    marginBottom: 16,
    borderRadius: 10,
  },

  kpiSection: {
    marginBottom: 10,
  },

  kpiCard: {
    height: 'auto',
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
    marginBottom: 4,
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
      
    ],
    [dashboardData],
  )

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
          title={`${dashboardData.blocked} library(s) bloquée(s) nécessitent une action.`}
        />
      )}

      <Flex
        justify="space-between"
        gap={12}
        wrap="wrap"
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
          title="Biosamples"
          value={
            dashboardData.uniqueBiosamples
          }
          icon={<TeamOutlined />}
          tone="purple"
          description="Échantillons uniques"
        />

{/* 
        <KpiCard
        title="Libraries indexées"
        value={dashboardData.indexedLibraries}
        icon={<BarcodeOutlined />}
        tone="cyan"
        description={`${calculatePercentage(
            dashboardData.indexedLibraries,
            dashboardData.total,
        )}% des libraries`}
        />

        <KpiCard
        title="Prêtes au séquençage"
        value={dashboardData.readyLibraries}
        icon={<CheckCircleOutlined />}
        tone="green"
        description={`${calculatePercentage(
            dashboardData.readyLibraries,
            dashboardData.total,
        )}% prêtes`}
        /> */}

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
          title="Prêtes Prêtes au séquençage"
          value={dashboardData.ready}
          icon={<CheckCircleOutlined />}
          tone="green"
          description={`${dashboardData.completionRate}% du total`}
        />

      </Flex>

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
  <Col xs={24} sm={12} md={6} lg={4}>
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
              styles={{ content: { 
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.1,
              }}}
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
            <span>{" --- "}</span>
            <Text
            type="secondary"
            style={styles.chartSubtitle}
          >
            {subtitle}
          </Text>
          </Text>

          
        </Flex>
      }
      styles={{
        header: {
          minHeight: 30,
        },
        body: {
           padding: '2px 5px 0',
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