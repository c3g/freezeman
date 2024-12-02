import type { Dayjs } from 'dayjs';
import React, { useCallback, useEffect } from "react";
import { FMSReportData, FMSReportInformation } from "../../models/fms_api_models";
import api from "../../utils/api";
import { useAppDispatch } from "../../hooks";
import { Button, DatePicker, Form, Select, Spin } from "antd";

export function Report() {
    const dispatch = useAppDispatch();
    const [reportName, setReportName] = React.useState<string>();
    const [nameOfAvailableReports, setNameOfAvailableReports] = React.useState<string[]>([]);
    const [reportInfo, setReportInfo] = React.useState<FMSReportInformation>();
    const [reportData, setReportData] = React.useState<FMSReportData>();

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
                    onChange={(value) => setReportName(value)}
                    options={nameOfAvailableReports.map((name) => ({ value: name, label: name }))}
                />
        </div>
        {reportName && reportInfo && <ReportForm reportName={reportName} reportInfo={reportInfo} />}
    </>
}

export interface ReportFormProps {
    reportName: string
    reportInfo: FMSReportInformation
}
function ReportForm({ reportName, reportInfo }: ReportFormProps) {
    const dispatch = useAppDispatch();
    const onFinish = useCallback((values: ReportFormObject) => {
        console.info(values)
        dispatch(api.report.getReport(
            reportName,
            values.start_date.format("YYYY-MM-DD"),
            values.end_date.format("YYYY-MM-DD"),
            values.time_window,
            values.group_by,
        )).then((response) => {
            console.info(response.data)
        })
    }, [dispatch, reportName])

    return <>
        <h1>
            {reportName}
        </h1>
        <Form onFinish={onFinish}>
            <Form.Item name={"group_by"} label={"Group By"}>
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
