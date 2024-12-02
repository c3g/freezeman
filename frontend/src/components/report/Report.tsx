import React, { useEffect } from "react";
import { FMSReportData, FMSReportInformation } from "../../models/fms_api_models";
import api from "../../utils/api";
import { useAppDispatch } from "../../hooks";

export function Report() {
    const dispatch = useAppDispatch();
    const [reportNames, setReportNames] = React.useState<string[]>();
    const [reportInfo, setReportInfo] = React.useState<FMSReportInformation>();
    const [reportData, setReportData] = React.useState<FMSReportData>();

    useEffect(() => {
        dispatch(api.report.listReports()).then((response) => {
            setReportNames(response.data);
        })
        dispatch(api.report.listReportInformation("production_report")).then((response) => {
            setReportInfo(response.data);
        })
        dispatch(api.report.getReport("production_report", "2024-06-01", "2024-12-01", "Weekly", ["library_type", "is_internal_library"])).then((response) => {
            setReportData(response.data);
        })
    }, [dispatch])

    return (
        <div>
            <div>
                <pre>
                    {reportNames && JSON.stringify(reportNames, undefined, 2)}
                </pre>
            </div>
            <div>
                <pre>
                    {reportInfo && JSON.stringify(reportInfo, undefined, 2)}
                </pre>
            </div>
            <div>
                <pre>
                    {reportData && JSON.stringify(reportData, undefined, 2)}
                </pre>
            </div>
        </div>
    );
}