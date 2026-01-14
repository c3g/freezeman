import React, { useMemo } from "react";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import { Button, Card, ConfigProvider, Flex, Select, Space, Spin, Typography } from "antd";
import SimpleExperimentRunTable, { ExperimentRunColumnID } from "./experimentRuns/SimpleExperimentRunTable";
import { DefaultOptionType } from "antd/es/select";
import './DashboardPage.scss'
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks";
import { selectSampleTemplateActions } from "../selectors";
import { FMSTemplateAction } from "../models/fms_api_models";

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
        label: 'Last 14 Days',
        value: 'last_14_days',
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

const timeRangeToFirstDate = {
    'last_7_days': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_14_days': new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_30_days': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_90_days': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
} as const

const TABLE_HEIGHT = '20em';
const CARD_HEIGHT = 30 // em

function DashboardPage() {
    const [experimentsNotLaunchedTimeRange, setExperimentsNotLaunchedTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')
    const [processedRunsTimeRange, setProcessedRunsTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')

    const navigate = useNavigate()

    const templates = useAppSelector((state) => selectSampleTemplateActions(state).items as FMSTemplateAction[] | undefined)
    const templateActionButtons = useMemo(() => {
        return templates?.filter((t) => t.name === 'Add Samples')?.map((template) => (
            <Button key={template.id} onClick={() => navigate(`/samples/actions/${template.id}/`)}>
                {template.name}
            </Button>
        )) ?? []
    }, [templates, navigate])

    return <PageContainer>
        <AppPageHeader title="Dashboard" />
        <PageContent>
            <Space orientation={"vertical"} style={{ width: '100%' }}>
                <Flex vertical={false} wrap={"wrap"} gap={"large"} justify={"center"}>
                    <DashboardCard title={"Last Launched Runs"}>
                        <SimpleExperimentRunTable
                            defaultPageSize={5}
                            columnIDs={lastLaunchedRunsColumns}
                            requestIDSuffix={".dashboard.lastLaunchedRuns"}
                            fixedQueryParams={useMemo(() => ({
                                run_processing_launch_time__isnull: false,
                                ordering: '-run_processing_launch_time',
                            }), [])}
                            tableHeight={TABLE_HEIGHT}
                            tableProps={useMemo(() => ({
                                pagination: false,
                                locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No launched runs found</div> },
                                className: 'table-in-card'
                            }), [])}
                        />
                    </DashboardCard>
                    <DashboardCard title={"Experiments Not Launched"}>
                        <Flex justify={"center"}>
                            <Select
                                defaultValue={experimentsNotLaunchedTimeRange}
                                onChange={setExperimentsNotLaunchedTimeRange}
                                options={timeRanges}
                            />
                        </Flex>
                        <SimpleExperimentRunTable
                            defaultPageSize={5}
                            columnIDs={notLaunchedColumns}
                            requestIDSuffix={".dashboard.experimentsNotLaunched"}
                            fixedQueryParams={useMemo(() => ({
                                run_processing_launch_time__isnull: true,
                                ordering: 'start_date',
                                start_date__gte: timeRangeToFirstDate[experimentsNotLaunchedTimeRange],
                            }), [experimentsNotLaunchedTimeRange])}
                            tableHeight={TABLE_HEIGHT}
                            tableProps={useMemo(() => ({
                                pagination: false,
                                locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No experiments found</div> },
                                className: 'table-in-card'
                            }), [])}
                        />
                    </DashboardCard>
                    <DashboardCard title={"Unvalidated Processed Runs"}>
                        <Flex justify={"center"}>
                            <Select
                                defaultValue={processedRunsTimeRange}
                                onChange={setProcessedRunsTimeRange}
                                options={timeRanges}
                            />
                        </Flex>
                        <SimpleExperimentRunTable
                            defaultPageSize={5}
                            columnIDs={lastLaunchedRunsColumns}
                            requestIDSuffix={".dashboard.processedRuns"}
                            fixedQueryParams={useMemo(() => ({
                                experiment_run_progress_stage: "processed",
                                ordering: '-run_processing_completion_time',
                                run_processing_completion_time__gte: timeRangeToFirstDate[processedRunsTimeRange],
                            }), [processedRunsTimeRange])}
                            tableHeight={TABLE_HEIGHT}
                            tableProps={useMemo(() => ({
                                pagination: false,
                                locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No processed runs found</div> },
                                className: 'table-in-card'
                            }), [])}
                        />
                    </DashboardCard>
                    <DashboardCard title={"Shortcuts"}>
                        <Flex vertical={true} gap={"1em"}>
                            <Button onClick={() => navigate('/projects/add/')}>Add Project</Button>
                            {templateActionButtons.length > 0 ? templateActionButtons : <Spin />}
                        </Flex>
                        <div></div>
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
    justify?: React.ComponentProps<typeof Flex>['justify']
}
function DashboardCard({ title, justify = 'space-between', children, ...props }: DashboardCardProps) {
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
                <Card style={{ width: '40%', height: `${CARD_HEIGHT}em` }} {...props}>
                    <Flex vertical={true} style={{ height: `${CARD_HEIGHT - 1}em` }} justify={justify} align={"center"}>
                        <DashboardCardTitle>{title}</DashboardCardTitle>
                        {children}
                    </Flex>
                </Card>
        </ConfigProvider>
}