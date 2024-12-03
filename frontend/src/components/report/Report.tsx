import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/lib/table'
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FMSReportData, FMSReportInformation } from "../../models/fms_api_models"
import api from "../../utils/api"
import { useAppDispatch } from "../../hooks"
import { Button, DatePicker, Empty, Flex, Form, Select, Space, Table, Tabs } from "antd"
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

export function Report() {
    const [activeKey, setActiveKey] = useState<string>("form")
    const [reportData, setReportData] = useState<FMSReportData>()

    return <>
        <AppPageHeader title={"Reports"} />
        <PageContent>
            <Tabs
                activeKey={activeKey}
                defaultActiveKey="form"
                centered
                onChange={setActiveKey}
                items={[
                    {
                        key: "form",
                        label: "Form",
                        children: <ReportForm onReportData={(reportData) => {
                            setReportData(reportData)
                            setActiveKey("report")
                        }} />
                    },
                    {
                        key: "report",
                        label: "Report",
                        children: reportData && <ReportTable {...reportData} />,
                        disabled: !reportData,
                    }
                ]}
            />
        </PageContent>
    </>
}

export interface ReportFormProps {
    onReportData: (data: FMSReportData) => void
}
function ReportForm({ onReportData }: ReportFormProps) {
    const dispatch = useAppDispatch()

    const [reportInfo, setReportInfo] = useState<FMSReportInformation>()
    const [nameOfAvailableReports, setNameOfAvailableReports] = useState<string[]>([])

    useEffect(() => {
        dispatch(api.report.listReports()).then((response) => {
            setNameOfAvailableReports(response.data)
        })
    }, [dispatch])

    const [form] = Form.useForm<ReportFormObject>()
    const reportName: string | undefined = Form.useWatch("report_name", form)
    console.info(reportName)
    useEffect(() => {
        if (reportName) {
            dispatch(api.report.listReportInformation(reportName)).then((response) => {
                setReportInfo(response.data)
            })
        }
    }, [dispatch, reportName])


    const onFinish = useCallback((values: ReportFormObject) => {
        if (reportInfo?.name) {
            dispatch(api.report.getReport(
                reportInfo.name,
                values.start_date.format("YYYY-MM-DD"),
                values.end_date.format("YYYY-MM-DD"),
                values.time_window,
                values.group_by,
            )).then((response) => {
                onReportData(response.data)
            })
        }
    }, [dispatch, onReportData, reportInfo?.name])

    return <>
        <Form onFinish={onFinish} form={form} labelCol={{ span: 2 }}>
            <Form.Item name={"report_name"} label={"Select Report"}>
                <Select
                    placeholder={"Name of Report"}
                    options={nameOfAvailableReports.map((name) => ({ value: name, label: name }))}
                />
            </Form.Item>
            <Form.Item name={"group_by"} label={"Group By"} initialValue={[]}>
                <Select<FMSReportInformation["groups"][number]>
                    placeholder={"Select fields to group by"}
                    options={reportInfo ? reportInfo.groups.map((name) => ({ value: name, label: name })) : []}
                    allowClear
                    mode={"multiple"}
                    disabled={!reportInfo}
                />
            </Form.Item>
            <Form.Item name={"time_window"} label={"Time Window"} initialValue={"Monthly"}>
                <Select<FMSReportInformation["time_windows"][number]>
                    placeholder={"Select Time Window"}
                    options={reportInfo ? reportInfo.time_windows.map((name) => ({ value: name, label: name })) : []}
                    allowClear
                    disabled={!reportInfo}
                />
            </Form.Item>
            <Form.Item name={"start_date"} label={"Start Date"}>
                <DatePicker disabled={!reportInfo} />
            </Form.Item>
            <Form.Item name={"end_date"} label={"End Date"}>
                <DatePicker disabled={!reportInfo} />
            </Form.Item>
            <Form.Item label={null}>
                <Button type="primary" htmlType="submit" disabled={!reportInfo}>
                    Request Report
                </Button>
            </Form.Item>
        </Form>
    </>
}

interface ReportFormObject {
    report_name: string
    group_by: string[]
    time_window: string
    start_date: Dayjs
    end_date: Dayjs
}

function ReportTable(reportData: FMSReportData) {
    type RecordType = NonNullable<NonNullable<FMSReportData['data'][number]['time_window_data']>[number]> & { key: string }

    const [timeWindow, setTimewindow] = useState<string>()

    const columns: ColumnsType<RecordType> = useMemo(() => 
        reportData.headers
            .sort((a, b) => a.field_order - b.field_order)
            .map((header) => ({
                title: header.display_name,
                key: header.name,
                dataIndex: header.name,
            })
    ), [reportData.headers])
    const timeWindowData = useMemo(() =>
        timeWindow
            ? reportData.data.find(({ time_window }) => time_window === timeWindow)?.time_window_data
            : undefined,
    [reportData.data, timeWindow])
    const dataSource = useMemo(() =>
        timeWindowData
            ? timeWindowData.map<RecordType>((data, index) => ({ ...data, key: index.toString() }))
            : [],
    [timeWindowData])

    return <>
        <Flex justify={"center"} gap={"small"} vertical>
            <Select
                placeholder={"Select Time-Window"}
                options={reportData.data.map(({ time_window, time_window_data: data }) =>  ({
                    value: time_window,
                    label: `${time_window} (${data ? data.length : 0})`
                }))}
                onChange={setTimewindow}
            />
            <Table<RecordType>
                columns={columns}
                dataSource={dataSource}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: <Empty description={timeWindow ? "No Data Available" : "Select a Time-Window"} /> }}
            />
        </Flex>
    </>
}