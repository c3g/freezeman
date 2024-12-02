import type { Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useState } from "react";
import { FMSReportData, FMSReportInformation } from "../../models/fms_api_models";
import api from "../../utils/api";
import { useAppDispatch } from "../../hooks";
import { Button, DatePicker, Form, Select, Spin, Table } from "antd";

export function Report() {
    const dispatch = useAppDispatch();
    const [reportName, setReportName] = useState<string>();
    const [nameOfAvailableReports, setNameOfAvailableReports] = useState<string[]>([]);
    const [reportInfo, setReportInfo] = useState<FMSReportInformation>();
    const [reportData, setReportData] = useState<FMSReportData>();

    useEffect(() => {
        dispatch(api.report.listReports()).then((response) => {
            setNameOfAvailableReports(response.data);
        })
    }, [dispatch])
    useEffect(() => {
        if (reportName) {
            dispatch(api.report.listReportInformation(reportName)).then((response) => {
                setReportInfo(response.data);
            })
        }
    }, [dispatch, reportName])


    return <>
        <div>
            Select Report:
                <Select
                    value={reportName}
                    placeholder={"Name of Report"}
                    onChange={setReportName}
                    options={nameOfAvailableReports.map((name) => ({ value: name, label: name }))}
                />
        </div>
        {reportInfo && <ReportForm reportInfo={reportInfo} onReportData={setReportData} />}
        {reportData && <ReportTable {...reportData} />}
    </>
}

export interface ReportFormProps {
    reportInfo: FMSReportInformation
    onReportData: (data: FMSReportData) => void
}
function ReportForm({ reportInfo, onReportData }: ReportFormProps) {
    const dispatch = useAppDispatch();
    const onFinish = useCallback((values: ReportFormObject) => {
        dispatch(api.report.getReport(
            reportInfo.name,
            values.start_date.format("YYYY-MM-DD"),
            values.end_date.format("YYYY-MM-DD"),
            values.time_window,
            values.group_by,
        )).then((response) => {
            onReportData(response.data);
        })
    }, [dispatch, onReportData, reportInfo.name])

    return <>
        <h1>
            {reportInfo.name}
        </h1>
        <Form onFinish={onFinish}>
            <Form.Item name={"group_by"} label={"Group By"} initialValue={[]}>
                <Select<FMSReportInformation["groups"][number]>
                    placeholder={"Select fields to group by"}
                    options={reportInfo.groups.map((name) => ({ value: name, label: name }))}
                    allowClear
                    mode={"multiple"}
                />
            </Form.Item>
            <Form.Item name={"time_window"} label={"Time Window"} initialValue={"Monthly"}>
                <Select<FMSReportInformation["time_windows"][number]>
                    placeholder={"Select Time Window"}
                    options={reportInfo.time_windows.map((name) => ({ value: name, label: name }))}
                    allowClear
                />
            </Form.Item>
            <Form.Item name={"start_date"} label={"Start Date"}>
                <DatePicker />
            </Form.Item>
            <Form.Item name={"end_date"} label={"End Date"}>
                <DatePicker />
            </Form.Item>
            <Form.Item label={null}>
                <Button type="primary" htmlType="submit">
                    Submit
                </Button>
            </Form.Item>
        </Form>
    </>
}

interface ReportFormObject {
    group_by: string[]
    time_window: string
    start_date: Dayjs
    end_date: Dayjs
}

function ReportTable(reportData: FMSReportData) {
    const [timeWindow, setTimewindow] = useState<string>();
    return <>
        <Select
            placeholder={"Select Time-Window"}
            options={reportData.data.map(({ time_window, time_window_data: data }) =>  ({
                value: time_window,
                label: `${time_window} (${data ? data.length : 0})`
            }))}
            onChange={setTimewindow}
        />
        {
            timeWindow && <Table
                columns={reportData.headers.map((header) => ({
                    title: header,
                    key: header,
                    dataIndex: header
                }))}
                dataSource={reportData.data.filter(({ time_window }) => time_window === timeWindow).map(({time_window_data: data }, index) => ({
                    ...data,
                    key: index
                }))}
            />
        }
    </>
}