import React, { CSSProperties, useMemo } from 'react'
import {Card,Col,Empty,Flex,Statistic,Typography,} from 'antd'
import {BarcodeOutlined, DatabaseOutlined,DeleteOutlined,ExperimentOutlined,SafetyCertificateOutlined,TeamOutlined,} from '@ant-design/icons'


import { Library } from '../../models/frontend_models'

const { Text } = Typography

type KpiTone =  | 'blue'  | 'purple'  | 'geekblue'  | 'green'  | 'gold'  | 'gray'


type KpiCardProps = {
  title: string
  value: number
  icon: React.ReactNode
  tone: KpiTone
  description: string
}


const styles: Record<string, CSSProperties> = {
  dashboard: {
    minHeight: '100%',
    padding: 4,
    background: '#f5f7fa',
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

  tableCard: {
    marginTop: 0,
    border: '1px solid #eaecf0',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(16, 24, 40, 0.04)',
    overflow: 'hidden',
  },
}

const kpiToneStyles: Record<KpiTone, CSSProperties> = {
  blue: {color: '#1677ff',background: '#e6f4ff',},
  purple: {color: '#722ed1',background: '#f9f0ff',},
  geekblue: {color: '#2f54eb',background: '#f0f5ff',},
  green: {color: '#389e0d',background: '#f6ffed',},
  gold: {color: '#d48806',background: '#fffbe6',},
  gray: {color: '#595959',background: '#f5f5f5',},
}


const calculatePercentage = ( value: number,total: number,): number => {
  if (total === 0) {return 0 }
  return Math.round((value / total) * 100)
}


const getKpiIconStyle = (tone: KpiTone,): CSSProperties => ({
  ...styles.kpiIcon,
  ...kpiToneStyles[tone],
})

function KpiCard({title,value,icon,tone,description,}: KpiCardProps) {
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

function ExternalIDLibraryDashboard({libraries,}: {libraries: Library[]}) {
  const dashboardData = useMemo(() => { 
    const uniqueBiosamples = new Set(libraries.map((library) => library.biosample_id).filter(Boolean),).size
    const depletedLibraries = libraries.filter((library) => library.depleted).length
  const indexedLibraries = libraries.filter((library) => library.index !== null,).length
    const qcPassed = libraries.filter((library) =>
        library.quality_flag === true &&
        library.quantity_flag === true
    ).length

    return {
      total: libraries.length,
      uniqueBiosamples,
      indexedLibraries,
      depletedLibraries,
      qcPassed, 
     
    }
  }, [libraries])

//  console.log(libraries)
  
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
     
      <Flex
        justify="space-between"
        gap={12}
        wrap="wrap"
        style={styles.kpiSection}
      >

            <KpiCard
            title="Total Libraries"
            value={dashboardData.total}
            icon={<DatabaseOutlined />}
            tone="blue"
            description="Overall project scope"
            />

            <KpiCard
            title="Biosamples"
            value={
                dashboardData.uniqueBiosamples
            }
            icon={<TeamOutlined />}
            tone="purple"
            description="Unique samples"
            />



            <KpiCard
                title="Depleted"
                value={dashboardData.depletedLibraries}
                icon={<DeleteOutlined />}
                tone="gold"
                description={`${calculatePercentage(dashboardData.depletedLibraries,dashboardData.total,)}% des libraries`}
            />


            <KpiCard
              title="Indexed"
              value={dashboardData.indexedLibraries}
              icon={<BarcodeOutlined />}
              tone="gray"
              description={`${calculatePercentage(
              dashboardData.indexedLibraries,
              dashboardData.total,
              )}% indexed`}
            />


            <KpiCard
            title="QC Passed"
            value={dashboardData.qcPassed}
            icon={<SafetyCertificateOutlined />}
            tone="green"
            description={`${calculatePercentage(dashboardData.qcPassed,dashboardData.total,)}% passed QC`}
            />
           

      </Flex>

    </div>
  )
}

export default ExternalIDLibraryDashboard