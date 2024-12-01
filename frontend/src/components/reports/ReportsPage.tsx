import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import PageContainer from "../PageContainer";
import ReportsSummary from "./ReportsSummary";

const ReportsPage = () => <PageContainer>
    <Routes>
        <Route path="/summary/*" element={<ReportsSummary />}/>
        <Route path="*" element={<Navigate to="/reports/summary" replace />} />
    </Routes>
</PageContainer>;

export default ReportsPage;