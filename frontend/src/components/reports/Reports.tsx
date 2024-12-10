import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/lib/table'
import React, { useCallback, useEffect, useState } from "react"
import { FMSReportData, FMSReportInformation } from "../../models/fms_api_models"
import api from "../../utils/api"
import { useAppDispatch } from "../../hooks"
import { Button, DatePicker, Empty, Form, Select, Table, Typography } from "antd"
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { useSearchParams } from 'react-router-dom'

export function Reports() {
    const [searchParams] = useSearchParams()

    return <>
        <AppPageHeader title={"Reports"} />
        <PageContent>
            {searchParams.has("report_name") && searchParams.has("start_date") && searchParams.has("end_date")
                ? <ReportTableWrapper />
                : <ReportForm />}
        </PageContent>
    </>
}

function ReportForm() {
    const [searchParams, setSearchParams] = useSearchParams()
    const paramReportName = searchParams.get("report_name")

    const dispatch = useAppDispatch()

    const [reportInfo, setReportInfo] = useState<FMSReportInformation>()
    const [nameOfAvailableReports, setNameOfAvailableReports] = useState<string[]>([])

    useEffect(() => {
        dispatch(api.report.listReports()).then((response) => {
            setNameOfAvailableReports(response.data)
        })
    }, [dispatch])

    const [reportName, setReportName] = useState<string | undefined>(paramReportName ?? undefined)
    useEffect(() => {
        if (reportName) {
            dispatch(api.report.listReportInformation(reportName)).then((response) => {
                setReportInfo(response.data)
            })
        }
    }, [dispatch, reportName])


    const onFinish = useCallback((values: ReportFormObject) => {
        if (reportInfo?.name) {
            const [start_date, end_date] = values.date_range
            setSearchParams({
                report_name: reportInfo.name,
                start_date: start_date.format("YYYY-MM-DD"),
                end_date: end_date.format("YYYY-MM-DD"),
                time_window: values.time_window,
                group_by: values.group_by,
            })
        }
    }, [reportInfo?.name, setSearchParams])

    return <>
        <Form onFinish={onFinish}>
            <Form.Item name={"report_name"} label={"Select Report"} initialValue={reportName} rules={[{ required: true, message: "Please select a report." }]}>
                <Select
                    placeholder={"Name of Report"}
                    options={nameOfAvailableReports.map((name) => ({ value: name, label: name }))}
                    onChange={setReportName}
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
            <Form.Item name={"date_range"} label={"Start-End Date"} rules={[{ required: true, message: "Please select start and end date." }]}>
                <DatePicker.RangePicker allowClear={false} />
            </Form.Item>
            <Form.Item label={null}>
                <Button type="primary" htmlType="submit" disabled={!reportInfo}>
                    Submit
                </Button>
            </Form.Item>
        </Form>
    </>
}

interface ReportFormObject {
    report_name: string
    group_by: string[]
    time_window: string
    date_range: [Dayjs, Dayjs]
}

function ReportTableWrapper() {
    const [reportData, setReportData] = useState<FMSReportData>()

    const dispatch = useAppDispatch()
    const [searchParams, setSearchParams] = useSearchParams()
    const reportName = searchParams.get("report_name")
    useEffect(() => {
        const startDate = searchParams.get("start_date")
        const endDate = searchParams.get("end_date")
        const timeWindow = searchParams.get("time_window") ?? "Monthly"
        const groupBy = searchParams.getAll("group_by")
        if (!reportName || !startDate || !endDate) {
            console.error({ reportName, startDate, endDate })
            setSearchParams({}, { replace: true })
            return
        }
        dispatch(api.report.getReport(
            reportName,
            startDate,
            endDate,
            timeWindow,
            groupBy
        )).then((response) => {
            setReportData(response.data)
        })
    }, [dispatch, reportName, searchParams, setSearchParams])

    return reportData ? <ReportTable {...reportData} /> : null
}

function ReportTable(reportData: FMSReportData) {
    type RecordType = NonNullable<NonNullable<FMSReportData['data'][number]['time_window_data']>[number]> & { key: string }

    const [timeWindow, setTimewindow] = useState<string | undefined>(reportData.data.find((d) => (d.time_window_data?.length ?? 0) > 0)?.time_window)

    const originalColumns: ColumnsType<RecordType> =
        reportData.headers
            .sort((a, b) => a.field_order - b.field_order)
            .map((header) => ({
                title: header.display_name,
                key: header.name,
                dataIndex: header.name,
            }))
    // if you want to add or remove columns, you can do it with this useState
    const [columns] = useState<ColumnsType<RecordType>>(originalColumns)

    const timeWindowData =
        timeWindow
            ? reportData.data.find(({ time_window }) => time_window === timeWindow)?.time_window_data
            : undefined
    const dataSource =
        timeWindowData
            ? timeWindowData.map<RecordType>((data, index) => ({ ...data, key: index.toString() }))
            : []

    return <>
            <Typography.Title key={"report-title"} style={{ marginTop: 0 }}>{reportData.name}</Typography.Title>
            {"Time Window: "}
            <Select
                key={"time-window-select"}
                placeholder={"Select Time-Window"}
                options={reportData
                    ? reportData.data.map(({ time_window, time_window_label, time_window_data: data }) =>  ({
                        value: time_window,
                        label: `${time_window_label} (${data ? data.length : 0})`
                    }))
                    : []
                }
                onChange={setTimewindow}
                defaultValue={timeWindow}
            />
            <Table<RecordType>
                key={"report-table"}
                columns={columns}
                dataSource={dataSource}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={timeWindow ? "No Data Available" : "Select a Time-Window"} /> }}
            />
        </>
}