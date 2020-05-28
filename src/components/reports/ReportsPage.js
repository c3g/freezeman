import React from "react";
import {Redirect, Route, Switch} from "react-router-dom";

import ReportsSampleContent from "./ReportsSampleContent";
import ReportsUserContent from "./ReportsUserContent";
import ReportsListContent from "./ReportsListContent";
import PageContainer from "../PageContainer";

const ReportsPage = () => <PageContainer>
    <Switch>
        <Route path="/reports/sample"><ReportsSampleContent /></Route>
        <Route path="/reports/user/:id"><ReportsUserContent /></Route>
        <Route path="/reports"><ReportsListContent /></Route>
        <Redirect to="/reports" />
    </Switch>
</PageContainer>;

export default ReportsPage;
