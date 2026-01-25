import React, { useMemo } from "react";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import { Button, Card, ConfigProvider, Divider, Flex, Select, Space, Spin, Typography } from "antd";
import SimpleExperimentRunTable, { ExperimentRunColumnID } from "./experimentRuns/SimpleExperimentRunTable";
import { DefaultOptionType } from "antd/es/select";
import './DashboardPage.scss'
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks";
import { selectSampleTemplateActions } from "../selectors";
import { FMSTemplateAction } from "../models/fms_api_models";
import { ExperimentOutlined, ProjectOutlined } from "@ant-design/icons";

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

const QUICK_ACCESS_BUTTON_WIDTH = 'fit-content'
const QUICK_ACCESS_TEXT_STYLE: React.CSSProperties = {
    fontSize: '2em',
    fontWeight: 'bold',
}
const QUICK_ACCESS_ICON_STYLE: React.CSSProperties = {
    fontSize: '6em'
}

function DashboardPage() {
    const [experimentsNotLaunchedTimeRange, setExperimentsNotLaunchedTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')
    const [processedRunsTimeRange, setProcessedRunsTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')

    const navigate = useNavigate()

    const templates = useAppSelector((state) => selectSampleTemplateActions(state).items as FMSTemplateAction[] | undefined)
    const templateActionButtons = useMemo(() => {
        return templates?.filter((t) => t.name === 'Add Samples')?.map((template) => (
            <Button key={template.id} style={{ width: QUICK_ACCESS_BUTTON_WIDTH }} onClick={() => navigate(`/samples/actions/${template.id}/`)} styles={{ root: { height: 'fit-content' } }}>
                <Flex vertical={true} align={"center"} gap={"small"}>
                    <div style={QUICK_ACCESS_TEXT_STYLE}>{template.name}</div>
                    <ExperimentOutlined style={QUICK_ACCESS_ICON_STYLE} />
                </Flex>
            </Button>
        )) ?? []
    }, [templates, navigate])

    return <PageContainer>
        <AppPageHeader title="Dashboard" />
        <PageContent>
            <Flex vertical={false} wrap={"wrap"} gap={"large"} justify={"center"} style={{ width: '100%' }}>
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
                            locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No unvalidated runs found</div> },
                            className: 'table-in-card'
                        }), [])}
                    />
                </DashboardCard>
                <DashboardCard title={"Quick Access"}>
                    <Flex vertical={false} gap={"1em"} align={"center"} justify={"center"} style={{ width: '100%' }}>
                        <Button style={{ width: QUICK_ACCESS_BUTTON_WIDTH }} onClick={() => navigate('/projects/add/')} styles={{ root: { height: 'fit-content' } }}>
                            <Flex vertical={true} align={"center"} gap={"small"}>
                                <div style={QUICK_ACCESS_TEXT_STYLE}>Add Project</div>
                                <ProjectOutlined style={QUICK_ACCESS_ICON_STYLE} />
                            </Flex>
                        </Button>
                        {templateActionButtons.length > 0 ? templateActionButtons : <Spin />}
                    </Flex>
                    <div></div>
                </DashboardCard>
            </Flex>
        </PageContent>
    </PageContainer>
}

export default DashboardPage

function DashboardCardTitle(props: React.ComponentProps<typeof Typography.Title>) {
    return <div style={{ width: '100%' }}>
        <ConfigProvider
            theme={{
                components: {
                    Typography: {
                        titleMarginBottom: '0.25em',
                        titleMarginTop: '0.25em',
                    }
                }
            }}
        >
            <Typography.Title level={4} style={{ marginTop: '0.25em', textAlign: 'center' }} {...props} />
            <ConfigProvider
                theme={{
                    token: {
                        margin: 0,
                        marginLG: 0,
                        marginXL: 0,
                    }
                }}
            >
                <Divider orientation={"horizontal"} />
            </ConfigProvider>
        </ConfigProvider>
    </div>
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
                <Card style={{ width: '49%', height: `${CARD_HEIGHT}em` }} styles={{ root: { border: '2px solid var(--ant-blue-3)' } }} {...props}>
                    <Flex vertical={true} style={{ height: `${CARD_HEIGHT - 1}em` }} justify={'space-between'} align={"center"}>
                        <DashboardCardTitle>{title}</DashboardCardTitle>
                        {children}
                    </Flex>
                </Card>
        </ConfigProvider>
}