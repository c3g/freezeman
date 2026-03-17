import React, { useMemo } from "react";
import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";
import { Button, Card, ConfigProvider, Divider, Flex, Select, Spin } from "antd";
import SimpleExperimentRunTable, { ExperimentRunColumnID } from "./experimentRuns/SimpleExperimentRunTable";
import { DefaultOptionType } from "antd/es/select";
import './DashboardPage.scss'
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks";
import { selectSampleTemplateActions } from "../selectors";
import { FMSTemplateAction } from "../models/fms_api_models";
import { ExperimentOutlined, ProjectOutlined } from "@ant-design/icons";

const notLaunchedColumns = [
    ExperimentRunColumnID.ID,
    ExperimentRunColumnID.NAME,
    ExperimentRunColumnID.START_DATE
]

const launchedRunsColumns = [
    ExperimentRunColumnID.ID,
    ExperimentRunColumnID.NAME,
    ExperimentRunColumnID.LAUNCH,
] as const

const finishedRunsColumns = [
    ExperimentRunColumnID.ID,
    ExperimentRunColumnID.NAME,
    ExperimentRunColumnID.PROCESSED,
] as const

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
    },
]

const timeRangeToFirstDate = {
    'last_7_days' : new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_14_days': new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_30_days': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    'last_90_days': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
} as const

const TABLE_HEIGHT = '17em' // match height in css selectors '.table-in-card .ant-table-body' in DashboardPage.scss
const CARD_HEIGHT = '30em' // most likely you would want to tweak the height in css selectors '.card-in-dashboard .ant-card-body' in DashboardPage.scss

const QUICK_ACCESS_BUTTON_STYLE: React.CSSProperties = {
    width: 'fit-content',
    padding: '0.25em',
}
const QUICK_ACCESS_TEXT_STYLE: React.CSSProperties = {
    fontSize: '1.5em',
    fontWeight: 'bold',
}
const QUICK_ACCESS_ICON_STYLE: React.CSSProperties = {
    fontSize: '1.5em'
}

function DashboardPage() {
    const [experimentsNotLaunchedTimeRange, setExperimentsNotLaunchedTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')
    const [processedRunsTimeRange, setProcessedRunsTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')
    const [processingRunsTimeRange, setProcessingRunsTimeRange] = React.useState<keyof typeof timeRangeToFirstDate>('last_30_days')

    const navigate = useNavigate()

    const templates = useAppSelector((state) => selectSampleTemplateActions(state).items as FMSTemplateAction[] | undefined)
    const templateActionButtons = useMemo(() => {
        return templates?.filter((t) => t.name === 'Add Samples')?.map((template) => (
            <Button key={template.id} style={QUICK_ACCESS_BUTTON_STYLE} onClick={() => navigate(`/samples/actions/${template.id}/`)} styles={{ root: { height: 'fit-content' } }}>
                <Flex vertical={false} align={"center"} gap={"small"}>
                    <ExperimentOutlined style={QUICK_ACCESS_ICON_STYLE} />
                    <div style={QUICK_ACCESS_TEXT_STYLE}>{template.name}</div>
                </Flex>
            </Button>
        )) ?? []
    }, [templates, navigate])

    return <PageContainer>
        <AppPageHeader title="Dashboard" />
        <PageContent>
            <Flex vertical={false} gap={"1em"} align={"center"} justify={"start"} style={{ width: '100%' }}>
                <Button style={QUICK_ACCESS_BUTTON_STYLE} onClick={() => navigate('/projects/add/')} styles={{ root: { height: 'fit-content' } }}>
                    <Flex vertical={false} align={"center"} gap={"small"}>
                        <ProjectOutlined style={QUICK_ACCESS_ICON_STYLE} />
                        <div style={QUICK_ACCESS_TEXT_STYLE}>Add Project</div>
                    </Flex>
                </Button>
                {templateActionButtons.length > 0 ? templateActionButtons : <Spin size={"small"} />}
            </Flex>
            <ConfigProvider
                theme={{
                    token: {
                        margin: 12,
                        marginLG: 12,
                        marginXL: 12,
                    }
                }}
            >
                <Divider orientation={"horizontal"} />
            </ConfigProvider>
            <Flex vertical={false} wrap={"wrap"} gap={"large"} justify={"center"} style={{ width: '100%' }}>
                <DashboardCard title={"Last Launched Experiments"}>
                    <div />
                    <SimpleExperimentRunTable
                        defaultPageSize={10}
                        columnIDs={launchedRunsColumns}
                        requestIDSuffix={".dashboard.lastLaunchedRuns"}
                        fixedQueryParams={useMemo(() => ({
                            run_processing_launch_time__isnull: false,
                            ordering: '-run_processing_launch_time',
                        }), [])}
                        tableHeight={TABLE_HEIGHT}
                        tableProps={useMemo(() => ({
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
                            popupMatchSelectWidth={false}
                        />
                    </Flex>
                    <SimpleExperimentRunTable
                        defaultPageSize={10}
                        columnIDs={notLaunchedColumns}
                        requestIDSuffix={".dashboard.experimentsNotLaunched"}
                        fixedQueryParams={useMemo(() => ({
                            run_processing_launch_time__isnull: true,
                            ordering: 'start_date',
                            start_date__gte: timeRangeToFirstDate[experimentsNotLaunchedTimeRange],
                            needs_run_processing: true,
                        }), [experimentsNotLaunchedTimeRange])}
                        tableHeight={TABLE_HEIGHT}
                        tableProps={useMemo(() => ({
                            locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No experiments found</div> },
                            className: 'table-in-card'
                        }), [])}
                    />
                </DashboardCard>
                <DashboardCard title={"Unvalidated Processed Experiments"}>
                    <Flex justify={"center"}>
                        <Select
                            defaultValue={processedRunsTimeRange}
                            onChange={setProcessedRunsTimeRange}
                            options={timeRanges}
                            popupMatchSelectWidth={false}
                        />
                    </Flex>
                    <SimpleExperimentRunTable
                        defaultPageSize={10}
                        columnIDs={finishedRunsColumns}
                        requestIDSuffix={".dashboard.processedRuns"}
                        fixedQueryParams={useMemo(() => ({
                            ordering: '-run_processing_launch_time',
                            run_processing_completion_time__gte: timeRangeToFirstDate[processedRunsTimeRange],
                            experiment_run_progress_stage: "processed",
                            is_processing_complete: true,
                        }), [processedRunsTimeRange])}
                        tableHeight={TABLE_HEIGHT}
                        tableProps={useMemo(() => ({
                            locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No unvalidated runs found</div> },
                            className: 'table-in-card'
                        }), [])}
                    />
                </DashboardCard>
                <DashboardCard title="Experiments Currently Being Processed">
                    <Flex justify={"center"}>
                        <Select
                            defaultValue={processingRunsTimeRange}
                            onChange={setProcessingRunsTimeRange}
                            options={timeRanges}
                            popupMatchSelectWidth={false}
                        />
                    </Flex>
                    <SimpleExperimentRunTable
                        defaultPageSize={10}
                        columnIDs={launchedRunsColumns}
                        requestIDSuffix={".dashboard.processingRuns"}
                        fixedQueryParams={useMemo(() => ({
                            ordering: 'run_processing_launch_time',
                            run_processing_launch_time__gte: timeRangeToFirstDate[processingRunsTimeRange],
                            is_processing_complete: false,
                            needs_run_processing: true,
                        }), [processingRunsTimeRange])}
                        tableHeight={TABLE_HEIGHT}
                        tableProps={useMemo(() => ({
                            locale: { emptyText: <div style={{ height: TABLE_HEIGHT, justifyContent: 'center', textAlign: 'center', alignContent: 'center' }}>No processing runs found</div> },
                            className: 'table-in-card'
                        }), [])}
                    />
                </DashboardCard>
            </Flex>
        </PageContent>
    </PageContainer>
}

export default DashboardPage

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
               <Card title={title} size={"small"} style={{ width: '49%', height: CARD_HEIGHT }} styles={{ root: { border: '2px solid var(--ant-blue-3)' } }} className={'card-in-dashboard'} {...props}>
                        {children}
               </Card>
        </ConfigProvider>
}
