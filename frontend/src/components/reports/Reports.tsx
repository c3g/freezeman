import type { ColumnsType } from 'antd/lib/table'
import React, { useCallback, useEffect, useState } from "react"
import { FMSReportData, FMSReportInformation } from "../../models/fms_api_models"
import api from "../../utils/api"
import { useAppDispatch } from "../../hooks"
import { Button, DatePicker, Empty, Form, Select, SelectProps, Space, Table, Typography } from "antd"
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import { notifyError } from '../../modules/notification/actions'
import { ArrowLeftOutlined } from '@ant-design/icons'

export const BASE_ROUTE = "/reports/"
const FORM_ROUTE = `${BASE_ROUTE}search/`
const LIST_ROUTE = `${BASE_ROUTE}list/`

export function Reports() {
    const [searchParams] = useSearchParams()
    return <>
        <AppPageHeader title={"Reports"} />
        <PageContent>
            <Routes>
                <Route path={FORM_ROUTE.slice(BASE_ROUTE.length)} element={<ReportForm />} />
                <Route path={LIST_ROUTE.slice(BASE_ROUTE.length)} element={<ReportTableWrapper />} />
                <Route path={"*"} element={<Navigate to={`${FORM_ROUTE}?${searchParams.toString()}`} replace/>} />
            </Routes>
        </PageContent>
    </>
}

function ReportForm() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const {
        report_name: paramReportName,
        start_date: paramStartDate,
        end_date: paramEndDate,
        time_window: paramTimeWindow,
        group_by: paramGroupBy,
    } = getParams(searchParams)
    useEffect(() => {
        // set default time window
        if (!paramTimeWindow) {
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.set("time_window", "Monthly")
            setSearchParams(newSearchParams, { replace: true })
        }   
    }, [paramTimeWindow, searchParams, setSearchParams])

    /* */

    interface ReportFormObject {
        report_name: string
        group_by: string[]
        time_window: string
        date_range: [Dayjs, Dayjs]
    }

    const dispatch = useAppDispatch()

    const [reportInfo, setReportInfo] = useState<FMSReportInformation>()
    const [reportNameOptions, setReportNameOptions] = useState<NonNullable<SelectProps['options']>>([])

    useEffect(() => {
        dispatch(api.report.listReports()).then((response) => {
            setReportNameOptions(response.data.map(({ name: value, display_name: label }) => ({ value, label })))
        })
    }, [dispatch])

    useEffect(() => {
        if (paramReportName) {
            dispatch(api.report.listReportInformation(paramReportName)).then((response) => {
                setReportInfo(response.data)
            })
        }
    }, [dispatch, paramReportName])


    const onFinish = useCallback((values: ReportFormObject) => {
        const [start_date, end_date] = values.date_range
        const newSearchParams = new URLSearchParams()
        newSearchParams.set("report_name", values.report_name)
        newSearchParams.set("start_date", start_date.format("YYYY-MM-DD"))
        newSearchParams.set("end_date", end_date.format("YYYY-MM-DD"))
        newSearchParams.set("time_window", values.time_window ?? "Monthly")
        values.group_by.forEach((group) => newSearchParams.append("group_by", group))        
        setSearchParams(newSearchParams, { replace: true })
        navigate({
            pathname: LIST_ROUTE,
            search: newSearchParams.toString(),
        })
    }, [navigate, setSearchParams])

    return <>
        <Typography.Title style={{ marginTop: 0 }}>Report Search Form</Typography.Title>
        <Form onFinish={onFinish}>
            <Form.Item name={"report_name"} label={"Select Report"} initialValue={paramReportName} rules={[{ required: true, message: "Please select a report." }]}>
                <Select
                    placeholder={"Select Report"}
                    options={reportNameOptions}
                    onChange={(name) => {
                        const newSearchParams = new URLSearchParams(searchParams)
                        newSearchParams.set("report_name", name)
                        setSearchParams(newSearchParams, { replace: true })
                    }}
                />
            </Form.Item>
            <Form.Item name={"group_by"} label={"Group By"} initialValue={paramGroupBy}>
                <Select<FMSReportInformation["groups"][number]>
                    placeholder={"Select fields to group by"}
                    options={reportInfo ? reportInfo.groups.map(({ name: value, display_name: label }) => ({ value, label })) : []}
                    allowClear
                    mode={"multiple"}
                    disabled={!reportInfo}
                    onChange={(group_by_many: unknown) => {
                        const newSearchParams = new URLSearchParams(searchParams)
                        newSearchParams.delete("group_by")
                        for (const group_by of (group_by_many as string[])) {
                            newSearchParams.append("group_by", group_by)
                        }
                        setSearchParams(newSearchParams, { replace: true })
                    }}
                />
            </Form.Item>
            <Form.Item name={"time_window"} label={"Time Window"} initialValue={"Monthly"}>
                <Select<FMSReportInformation["time_windows"][number]>
                    placeholder={"Select Time Window"}
                    options={reportInfo ? reportInfo.time_windows.map((name) => ({ value: name, label: name })) : []}
                    allowClear
                    disabled={!reportInfo}
                    onChange={(time_window) => {
                        const newSearchParams = new URLSearchParams(searchParams)
                        newSearchParams.set("time_window", time_window)
                        setSearchParams(newSearchParams, { replace: true })
                    }}
                />
            </Form.Item>
            <Form.Item
                name={"date_range"} label={"Start-End Date"}
                initialValue={[ paramStartDate ? dayjs(paramStartDate) : undefined, paramEndDate ? dayjs(paramEndDate) : undefined ]}
                rules={[{ required: true }]}
            >
                <DatePicker.RangePicker
                    allowClear={false}
                    onChange={(dates) => {
                        const newSearchParams = new URLSearchParams(searchParams)
                        if (dates && dates[0]) {
                            newSearchParams.set("start_date", dates[0].format("YYYY-MM-DD"))
                        } else {
                            newSearchParams.delete("start_date")
                        }
                        if (dates && dates[1]) {
                            newSearchParams.set("end_date", dates[1].format("YYYY-MM-DD"))
                        } else {
                            newSearchParams.delete("end_date")
                        }
                        setSearchParams(newSearchParams, { replace: true })
                    }}
                />
            </Form.Item>
            <Form.Item label={null}>
                <Button type="primary" htmlType="submit" disabled={!reportInfo || !paramStartDate || !paramEndDate}>
                    Submit
                </Button>
            </Form.Item>
        </Form>
    </>
}

function ReportTableWrapper() {
    const dispatch = useAppDispatch()

    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const goBack = useCallback(() => {
        navigate({
            pathname: FORM_ROUTE,
            search: searchParams.toString()
        })
    }, [navigate, searchParams])

    const [reportData, setReportData] = useState<FMSReportData>()

    const reportName = searchParams.get("report_name")
    useEffect(() => {
        const startDate = searchParams.get("start_date")
        const endDate = searchParams.get("end_date")
        const timeWindow = searchParams.get("time_window") ?? "Monthly"
        const groupBy = searchParams.getAll("group_by")
        if (!reportName || !startDate || !endDate) {
            console.error({ reportName, startDate, endDate })
            dispatch(notifyError({
                title: "Invalid Parameters for Reports",
                description: "Please provide report name and date range.",
                id: "reports-invalid-parameters"
            }))
            goBack()
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
    }, [dispatch, goBack, reportName, searchParams, setSearchParams])

    return <>
        {reportData && <ReportTable {...reportData} />}
        <Button onClick={goBack}>
            <Space>
                <ArrowLeftOutlined />
                {"Back"}
            </Space>
        </Button>

    </>
}

function ReportTable(reportData: FMSReportData) {
    type RecordType = NonNullable<NonNullable<FMSReportData['data'][number]['time_window_data']>[number]> & { key: string }

    const [timeWindow, setTimewindow] = useState<string | undefined>(reportData.data.find((d) => (d.time_window_data?.length ?? 0) > 0)?.time_window)

    const originalColumns: ColumnsType<RecordType> =
        reportData.headers
            .sort((a, b) => a.field_order - b.field_order)
            .map((header) => {
                let title = header.display_name
                const key = header.name
                const dataIndex = header.name

                if (header.aggregation) {
                    title = `${header.display_name} (${header.aggregation})`
                } else if (reportData.grouped_by.includes(header.name)) {
                    title = `${header.display_name} (Grouped By)`
                }

                return { title, key, dataIndex } 
            })
    // if you want to add or remove columns, you can do it with this useState
    const [columns] = useState<ColumnsType<RecordType>>(originalColumns)

    const fieldNameToHeader = reportData.headers.reduce<Record<string, typeof reportData.headers[0]>>((acc, header) => {
        acc[header.name] = header
        return acc
    }, {})

    const timeWindowData =
        timeWindow
            ? reportData.data.find(({ time_window }) => time_window === timeWindow)?.time_window_data
            : undefined
    const dataSource =
        timeWindowData
            ? timeWindowData.map<RecordType>((data, index) => {
                const record = { ...data, key: index.toString() }
                for (const [key, value] of Object.entries(data)) {
                    switch (fieldNameToHeader[key].data_type) {
                        case "boolean":
                            record[key] = value ? "Yes" : "No"
                            break
                        case "date":
                            record[key] = value ? value : "N/A"
                            break
                        case "number":
                            record[key] = value ? Number(value).toLocaleString('fr') : "N/A"
                            break
                        case "string":
                            record[key] = value ? value : "N/A"
                            break
                        default:
                            record[key] = value
                    }
                }
                return record
            })
            : []

    return <>
            <Typography.Title italic style={{ marginTop: 0, marginBottom: 0 }}>{reportData.report.display_name} report</Typography.Title>
            <Typography.Title level={4} style={{ marginTop: 0, marginLeft: '2rem' }}>From {reportData.start_date} To {reportData.end_date}</Typography.Title>
            <div style={{ marginBottom: '0.5em' }}>
                {"Time Window: "}
                <Select
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
                    popupMatchSelectWidth={false}
            />
            </div>
            <Table<RecordType>
                key={"report-table"}
                columns={columns}
                dataSource={dataSource}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={timeWindow ? "No Data Available" : "Select a Time-Window"} /> }}
            />
        </>
}

function getParams(searchParams: URLSearchParams) {
    const report_name = searchParams.get("report_name")
    const start_date = searchParams.get("start_date") ?? undefined
    const end_date = searchParams.get("end_date") ?? undefined
    const time_window = searchParams.get("time_window") ?? undefined
    const group_by = searchParams.getAll("group_by")
    return {
        report_name,
        start_date,
        end_date,
        time_window,
        group_by,
    }
}
