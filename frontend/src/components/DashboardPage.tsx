import React, { useMemo } from "react";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import { Card, ConfigProvider, Flex, Select, Space, Typography } from "antd";
import SimpleExperimentRunTable, { ExperimentRunColumnID } from "./experimentRuns/SimpleExperimentRunTable";
import { DefaultOptionType } from "antd/es/select";

const lastLaunchedRunsColumns = [
    ExperimentRunColumnID.ID,
    ExperimentRunColumnID.NAME,
    ExperimentRunColumnID.LAUNCH,
] as const

const notLaunchedColumns = [
    ExperimentRunColumnID.ID,
    ExperimentRunColumnID.NAME,
    ExperimentRunColumnID.START_DATE
]

const timeRanges: DefaultOptionType[] = [
    {
        label: 'Last 7 Days',
        value: 'last_7_days',
    },
    {
        label: 'Last 30 Days',
        value: 'last_30_days',
    },
    {
        label: 'Last 90 Days',
        value: 'last_90_days',
    }
]

const timeRangeToFirstDate: Record<string, string> = {
    'last_7_days': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_30_days': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_90_days': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
}

function DashboardPage() {
    const [currentTimeRange, setCurrentTimeRange] = React.useState<string>('last_30_days');
    return <PageContainer>
        <AppPageHeader title="Dashboard" />
        <PageContent>
            <Space orientation={"vertical"} style={{ width: '100%' }}>
                <Flex justify={"center"}>
                    <Select
                        defaultValue={'last_30_days'}
                        onChange={setCurrentTimeRange}
                        options={timeRanges}
                    />
                </Flex>
                <Flex vertical={false} wrap={"wrap"} gap={"large"} justify={"center"}>
                    <DashboardCard title={"Last Launched Runs"}>
                        <SimpleExperimentRunTable
                            defaultPageSize={10}
                            columnIDs={lastLaunchedRunsColumns}
                            requestIDSuffix={".dashboard.lastLaunchedRuns"}
                            fixedQueryParams={useMemo(() => ({
                                run_processing_launch_time__isnull: false,
                                ordering: '-run_processing_launch_time',
                                run_processing_launch_time__gte: timeRangeToFirstDate[currentTimeRange],
                            }), [currentTimeRange])}
                            tableProps={{
                                pagination: false, style: { height: '14.5em' },
                                locale: { emptyText: <div style={{ height: '14.5em', justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No launched runs found</div> }
                            }}
                        />
                    </DashboardCard>
                    <DashboardCard title={"Experiments Not Launched"}>
                        <SimpleExperimentRunTable
                            defaultPageSize={10}
                            columnIDs={notLaunchedColumns}
                            requestIDSuffix={".dashboard.experimentsNotLaunched"}
                            fixedQueryParams={useMemo(() => ({
                                run_processing_launch_time__isnull: true,
                                ordering: 'start_date',
                                start_date__gte: timeRangeToFirstDate[currentTimeRange],
                            }), [currentTimeRange])}
                            tableProps={{
                                pagination: false, style: { height: '14.5em' },
                                locale: { emptyText: <div style={{ height: '14.5em', justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No experiments found</div> }
                            }}
                        />
                    </DashboardCard>
                    <DashboardCard title={"Processed Runs"}>
                        <SimpleExperimentRunTable
                            defaultPageSize={10}
                            columnIDs={lastLaunchedRunsColumns}
                            requestIDSuffix={".dashboard.processedRuns"}
                            fixedQueryParams={useMemo(() => ({
                                experiment_run_progress_stage: "processed",
                                ordering: '-run_processing_completion_time',
                                run_processing_completion_time__gte: timeRangeToFirstDate[currentTimeRange],
                            }), [currentTimeRange])}
                            tableProps={{
                                pagination: false, style: { height: '14.5em' },
                                locale: { emptyText: <div style={{ height: '14.5em', justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No processed runs found</div> }
                            }}
                        />
                    </DashboardCard>
                </Flex>
            </Space>
        </PageContent>
    </PageContainer>
}

export default DashboardPage

function DashboardCardTitle(props: React.ComponentProps<typeof Typography.Title>) {
    return <ConfigProvider
        theme={{
            components: {
                Typography: {
                    titleMarginBottom: '0.25em',
                    titleMarginTop: '0.25em',
                }
            },
        }}
    >
        <Typography.Title level={4} style={{ marginTop: '0.25em', textAlign: 'center' }} {...props} />
    </ConfigProvider>
}

interface DashboardCardProps extends React.ComponentProps<typeof Card> {
    title: React.ReactNode
}
function DashboardCard({ title, children, ...props }: DashboardCardProps) {
    return <ConfigProvider
                theme={{
                    components: {
                        Card: {
                            bodyPadding: 5,
                            bodyPaddingSM: 5,
                        },
                    },
                }}
            >
                <Card style={{ width: '30%', height: '20em' }} {...props}>
                    <DashboardCardTitle>{title}</DashboardCardTitle>
                    {children}
                </Card>
        </ConfigProvider>
}